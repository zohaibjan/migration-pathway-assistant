# Migration Assist - Agent Instructions

## Product Goal

Migration Assist is a public-facing mobile app for general users exploring Australian visa options. The primary jobs are to guide users on:

- Whether they may be eligible for common visa pathways.
- What evidence or documents they already need to prepare.
- What gaps or risks they should review before speaking to a professional.
- (v0.2) An optional AI assistant that takes pasted text and/or uploaded documents and returns a plain-English summary of likely visa pathways, gaps and next steps.

The app must be careful, plain-English, and non-alarmist. It must never present itself as legal advice or guarantee visa eligibility.

## Architecture

- Expo + React Native + TypeScript.
- React Navigation with a bottom-tab main app and stack screens for assessment / results / AI results / auth.
- Two assessment paths live side-by-side:
  - **Guided assessment** (offline, deterministic) - questionnaire in `src/screens/Assessment` + ranking in `src/services/assessmentEngine.ts` + 9-entry `src/data/visaOptions.ts`.
  - **AI Assistant** (Supabase + Edge Function) - paste text / upload docs in `src/screens/Assistant`, calls the `analyze-migration` Edge Function, renders in `src/screens/AIResults`.
- Auth is **optional**: the guided assessment works without an account; the AI Assistant requires sign-in (so we get RLS-scoped storage and a JWT for the Edge Function).
- Saved assessments use `AsyncStorage` (`src/services/storage.ts`) for both guided and AI results.
- AI assessments are also persisted server-side in `ma_assessments` (RLS-scoped to the user) by the Edge Function.
- Visa catalog is **versioned and refreshable** - see "Freshness model" below.
- Migration news is fetched from the `migration_news` Supabase table (refilled by a daily Edge Function).
- Shared types live in `src/types/index.ts`.
- Shared UI primitives live in `src/components/ui/`.
- Supabase wiring lives in `src/services/supabase.ts`; URL + anon key come from `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

## Freshness model

The visa catalog has three layers, in order of preference:

1. **Live**: `public.visa_subclasses` rows whose `source = 'live'`, populated by `refresh-visa-data` from the Department of Home Affairs page when reachable.
2. **AI-knowledge**: same rows when Home Affairs was blocked - the `refresh-visa-data` function falls back to the LLM's training knowledge with explicit "verify" caveats.
3. **Seed**: bundled `src/data/visaCatalogSeed.ts` (mirrors `supabase/seed/visa_subclasses_seed.sql`). Always available offline.

Loaders:

- `src/services/visaCatalog.ts::loadVisaCatalog` - tries Supabase, then a 24-hour AsyncStorage cache, then the bundled seed. Always returns a `VisaCatalogSnapshot` with a `freshness` block the UI can display.
- `src/services/visaCatalog.ts::refreshVisaCatalogNow` - manual trigger for the `refresh-visa-data` Edge Function. Per-signed-in-user rate limit applied server-side.
- `src/services/migrationNews.ts::loadRecentNews` / `refreshMigrationNewsNow` - same shape for the news table.

Refresh schedule (configured in `supabase/schema.sql`, commented out by default - enable `pg_cron` + `pg_net` extensions first):

- `refresh-visa-data` weekly (Sunday 18:00 UTC).
- `refresh-migration-news` daily (19:00 UTC).

The `analyze-migration` Edge Function injects the freshest `visa_subclasses` rows into the LLM prompt before answering, so even an older bundled mobile app benefits from a recent server-side refresh.

## UX Principles

- General users do not know visa jargon. Use short labels and explain gaps.
- Every result should answer: "What looks possible?", "What is missing?", "What should I do next?"
- Always show the disclaimer in relevant places.
- Prefer "possible pathway" and "needs review" over hard yes/no unless a clear blocker exists.
- Do not ask for more information than needed for a first-pass pathway screen.
- Sign-in friction must stay low: guest mode keeps the local guided flow available.

## Engineering Rules

- Keep secrets out of the mobile app. The OpenAI / LLM key lives **only** in `supabase secrets`. The mobile app holds at most the public Supabase URL and anon key.
- Do not add legal conclusions without a source and a professional-review caveat.
- Keep guided assessment rules deterministic and testable. Add new rules in `assessmentEngine.ts`.
- Keep visa content in `visaOptions.ts` so screens remain presentation-only.
- Use TypeScript strictly; avoid `any`.
- Keep user data local unless a future explicit backend sync feature is added. The AI assessments are an opt-in (sign-in required) backend sync today.
- Use ASCII for files unless the source already requires Unicode.
- All AI calls must go through the `analyze-migration` Supabase Edge Function. Never call OpenAI directly from the mobile app.
- Supabase Storage uploads must be scoped to `${user_id}/...` and never accept a path that does not start with the caller's `user_id` (the Edge Function rejects mismatched paths).
- When updating the visa catalog, update **both** `supabase/seed/visa_subclasses_seed.sql` and `src/data/visaCatalogSeed.ts` so the offline seed and the SQL seed stay in lockstep. Update `VISA_CATALOG_SEED_AT` to today.
- Never let `refresh-visa-data` or `refresh-migration-news` invent fees or numeric thresholds when the source is unreachable - they must fall back to the LLM with `source_notes` that say "verify on immi.homeaffairs.gov.au".

## Future Integration Boundary

When connecting to the existing AMA backend, add a service under `src/services/api.ts` that calls public-safe endpoints only. Do not put OpenAI keys, JWT secrets, or privileged backend credentials in the app.

Candidate future features:

- OCR for image uploads (the Edge Function currently flags images for the user to describe in text).
- Export / share PDF report.
- Backend-backed visa rule updates (replace static `visaOptions.ts` with a Supabase table).
- Professional referral CTA.
- Cross-device sync of guided assessments (today only AI assessments sync).

## Running

```powershell
cd migration-pathway-assistant
npm install
npm run start
```

Use Expo Go or an Expo development build for device testing.

For the AI Assistant tab to work end-to-end, also follow `supabase/README.md` to apply `schema.sql`, set `OPENAI_API_KEY` (or another `LLM_API_KEY`) as a Supabase secret, and run:

```powershell
supabase functions deploy analyze-migration
```

No populated environment file is supplied. Configure your own Supabase project using `.env.example`.
