# Supabase backend for Migration Assist

This folder holds everything the Supabase project needs:

- `schema.sql` - all tables (`ma_assessments`, `visa_subclasses`, `visa_data_meta`, `migration_news`), the `migration-docs` Storage bucket, RLS policies, and (commented out) `pg_cron` schedules.
- `seed/visa_subclasses_seed.sql` - hand-curated initial visa catalog (~22 subclasses) marked as `source='seed'`.
- `functions/analyze-migration/` - the Edge Function that analyses pasted text + uploaded documents. Reads `visa_subclasses` for grounding before calling the LLM.
- `functions/delete-account/` - the Edge Function that permanently deletes the caller's account: scrubs their `migration-docs` files, deletes their `ma_assessments` rows, and removes the auth user. Backs the in-app "Delete account" button (Apple Guideline 5.1.1(v)).
- `functions/refresh-visa-data/` - the Edge Function that re-populates `visa_subclasses` from the LLM (and from Home Affairs when the IP isn't blocked).
- `functions/refresh-migration-news/` - scrapes Migration Alliance + Home Affairs news, falls back to an LLM summary if both sources are unreachable.

The mobile app never holds the LLM API key. It only holds the public Supabase URL and anon key.

## One-time setup

1. Make sure the Supabase CLI is installed and logged in: `supabase login`.
2. Link the local folder to your Supabase project:

   ```powershell
   cd migration-pathway-assistant
   supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Apply the schema and seed:

   - Open Supabase Studio > SQL Editor.
   - Paste `supabase/schema.sql`, run.
   - Paste `supabase/seed/visa_subclasses_seed.sql`, run.

4. Set the LLM secret in the Supabase project (server-side only):

   ```powershell
   # Cheapest free option:
   supabase secrets set LLM_PROVIDER=gemini
   supabase secrets set LLM_API_KEY=AIza...
   supabase secrets set LLM_MODEL=gemini-2.0-flash

   # OR paid OpenAI:
   supabase secrets set LLM_PROVIDER=openai
   supabase secrets set OPENAI_API_KEY=sk-proj-...
   supabase secrets set LLM_MODEL=gpt-4o-mini
   ```

5. Deploy all three Edge Functions:

   ```powershell
   supabase functions deploy analyze-migration
   supabase functions deploy delete-account
   supabase functions deploy refresh-visa-data
   supabase functions deploy refresh-migration-news
   ```

6. (Optional but recommended) Enable the cron schedules:

   - In Supabase Studio > Database > Extensions, enable `pg_cron` and `pg_net`.
   - Open the bottom of `schema.sql`, uncomment the `cron.schedule(...)` blocks, replace `YOUR_PROJECT_REF` and `YOUR_ANON_KEY` with your project's values, and run them in the SQL Editor.
   - The visa catalog will then refresh every Sunday 18:00 UTC and migration news every day 19:00 UTC.

## Verifying

- **AI tab**: sign in to the mobile app, paste a paragraph, tap Analyze. You should see a structured response screen and a new row in `public.ma_assessments`.
- **Visa catalog freshness**: open the Settings tab on the mobile app. The "Visa data freshness" card shows the source (`seed` / `live` / `ai-knowledge`) and how old it is. After a successful manual refresh the source flips to `live` and the timestamp updates.
- **Migration news**: the Home tab shows a "Recent migration news" card after `refresh-migration-news` has run at least once.
- **Edge Function logs**: visible in `Functions > <name> > Logs` in Supabase Studio.

## Why this freshness model

- The mobile app ships with a **bundled seed** (`src/data/visaCatalogSeed.ts`) so it works fully offline.
- When online, it reads `public.visa_subclasses` instead - that table is **canonical** and always at-least-as-fresh as the seed.
- The `refresh-visa-data` Edge Function updates the table by:
  1. Trying to fetch the Department of Home Affairs page for the subclass (best-effort, often blocked from VPS IPs).
  2. Asking the LLM to return current authoritative info, with explicit "verify on Home Affairs" caveats.
  3. Writing back with `source = 'live'` (if Home Affairs returned content) or `source = 'ai-knowledge'` (LLM-only fallback).
- The `analyze-migration` function injects the catalog rows into the LLM prompt so even an older bundled app benefits from a fresh server-side catalog.
- Manual refresh is rate-limited per signed-in user (10 / hour); cron runs are unlimited.
