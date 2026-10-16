-- ============================================================
-- Migration Assist - Supabase schema (idempotent)
-- ============================================================
-- Apply once to the Supabase project that backs the mobile app:
--   supabase db push           (if linked to a local project)
--   OR paste this file into Supabase Studio > SQL Editor and run.
--
-- This file:
--   1. ma_assessments       — one row per AI assessment, owner-only RLS.
--   2. visa_subclasses      — canonical visa catalog, anon-readable.
--   3. visa_data_meta       — singleton row with last_full_refresh_at.
--   4. migration_news       — recent migration news, anon-readable.
--   5. migration-docs bucket — private, ${user_id}/... per-user RLS.
--   6. (optional) pg_cron schedule — see bottom of file.
--
-- Safe to run multiple times.
-- ============================================================

-- ── 1. ma_assessments table ───────────────────────────────────
create table if not exists public.ma_assessments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  created_at      timestamptz not null default now(),
  pasted_text     text,
  document_paths  text[]      not null default '{}',
  payload         jsonb       not null,
  llm_provider    text,
  llm_model       text
);

create index if not exists ma_assessments_user_idx
  on public.ma_assessments (user_id, created_at desc);

alter table public.ma_assessments enable row level security;

drop policy if exists "ma_assessments_select_own" on public.ma_assessments;
drop policy if exists "ma_assessments_insert_own" on public.ma_assessments;
drop policy if exists "ma_assessments_delete_own" on public.ma_assessments;

create policy "ma_assessments_select_own"
  on public.ma_assessments for select
  using (auth.uid() = user_id);

create policy "ma_assessments_insert_own"
  on public.ma_assessments for insert
  with check (auth.uid() = user_id);

create policy "ma_assessments_delete_own"
  on public.ma_assessments for delete
  using (auth.uid() = user_id);

-- ── 2. visa_subclasses table — canonical visa catalog ────────
-- The mobile app reads this when online. When the row is missing or stale
-- the app falls back to its bundled seed data (src/data/visaOptions.ts).
create table if not exists public.visa_subclasses (
  code                text primary key,        -- e.g. '189', '820/801'
  name                text not null,
  category            text not null,           -- Skilled, Employer sponsored, ...
  stream              text,
  summary             text not null,
  best_for            text[] not null default '{}',
  core_requirements   text[] not null default '{}',
  documents           text[] not null default '{}',
  base_fee_aud        integer,
  processing_time     text,
  official_search_hint text,
  official_url        text,
  legislation_url     text,
  source              text not null default 'seed' check (source in ('seed','live','ai-knowledge')),
  source_notes        text,
  last_updated_at     timestamptz not null default now(),
  display_order       integer not null default 100
);

create index if not exists visa_subclasses_category_idx
  on public.visa_subclasses (category, display_order);

alter table public.visa_subclasses enable row level security;

drop policy if exists "visa_subclasses_anon_read" on public.visa_subclasses;

-- Anon and signed-in users can read everything; only service-role writes.
create policy "visa_subclasses_anon_read"
  on public.visa_subclasses for select
  using (true);

-- ── 3. visa_data_meta — singleton freshness row ──────────────
create table if not exists public.visa_data_meta (
  id                  smallint primary key default 1 check (id = 1),
  data_version        integer not null default 1,
  last_full_refresh_at timestamptz not null default now(),
  last_refresh_status  text not null default 'seed',
  last_refresh_notes   text,
  next_refresh_due_at  timestamptz
);

insert into public.visa_data_meta (id) values (1) on conflict (id) do nothing;

alter table public.visa_data_meta enable row level security;

drop policy if exists "visa_data_meta_anon_read" on public.visa_data_meta;
create policy "visa_data_meta_anon_read"
  on public.visa_data_meta for select
  using (true);

-- ── 4. migration_news ─────────────────────────────────────────
create table if not exists public.migration_news (
  id              uuid primary key default gen_random_uuid(),
  url             text not null unique,
  title           text not null,
  source          text not null,              -- e.g. 'Migration Alliance', 'Home Affairs', 'AI summary'
  summary         text,
  affected_visas  text[] not null default '{}',
  published_at    timestamptz,
  scraped_at      timestamptz not null default now()
);

create index if not exists migration_news_published_idx
  on public.migration_news (published_at desc nulls last, scraped_at desc);

alter table public.migration_news enable row level security;

drop policy if exists "migration_news_anon_read" on public.migration_news;
create policy "migration_news_anon_read"
  on public.migration_news for select
  using (true);

-- ── 5. migration-docs Storage bucket ──────────────────────────
insert into storage.buckets (id, name, public)
values ('migration-docs', 'migration-docs', false)
on conflict (id) do nothing;

drop policy if exists "migration_docs_read_own"   on storage.objects;
drop policy if exists "migration_docs_insert_own" on storage.objects;
drop policy if exists "migration_docs_update_own" on storage.objects;
drop policy if exists "migration_docs_delete_own" on storage.objects;

create policy "migration_docs_read_own"
  on storage.objects for select
  using (
    bucket_id = 'migration-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "migration_docs_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'migration-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "migration_docs_update_own"
  on storage.objects for update
  using (
    bucket_id = 'migration-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'migration-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "migration_docs_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'migration-docs'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- (Optional) pg_cron schedule — uncomment after enabling extensions.
-- ============================================================
-- Requires: extensions pg_cron + pg_net + http (enable from Supabase Studio
-- > Database > Extensions). Replace ANON_KEY with your real anon key.
-- Each refresh function is invoked weekly with an Authorization header that
-- the function itself treats as a "scheduled" call (it uses the service-role
-- key from its own env, so this header is just a transport token).
--
-- create extension if not exists pg_net;
-- create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'refresh-visa-data-weekly',
--   '0 18 * * 0',  -- every Sunday 18:00 UTC
--   $$
--     select net.http_post(
--       url := 'https://YOUR_PROJECT_REF.functions.supabase.co/refresh-visa-data',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer YOUR_ANON_KEY'
--       ),
--       body := jsonb_build_object('source', 'cron')
--     );
--   $$
-- );
--
-- select cron.schedule(
--   'refresh-migration-news-daily',
--   '0 19 * * *',  -- every day 19:00 UTC
--   $$
--     select net.http_post(
--       url := 'https://YOUR_PROJECT_REF.functions.supabase.co/refresh-migration-news',
--       headers := jsonb_build_object(
--         'Content-Type', 'application/json',
--         'Authorization', 'Bearer YOUR_ANON_KEY'
--       ),
--       body := jsonb_build_object('source', 'cron')
--     );
--   $$
-- );
