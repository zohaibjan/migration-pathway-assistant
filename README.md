# Migration Pathway Assistant

> Portfolio prototype demonstrating offline rules, an optional AI workflow and per-user document storage. It is not a validated visa eligibility service. Bundled rules and AI-generated catalog entries can be incomplete or out of date; verify information with official sources and a qualified professional. Use synthetic data when evaluating this repository.

Migration Assist is an Expo mobile app for general users who want to understand possible Australian visa pathways before speaking with a professional.

It focuses on guided eligibility signals, likely gaps, document checklists, and next steps. It is general information only, not legal advice.

## What's in the app

Two assessment paths sit side-by-side so the app stays useful even without a network or an account:

- **Guided assessment (offline)** - a plain-English questionnaire that runs through a deterministic ranking engine. Works without any account or network.
- **AI Assistant (Supabase + OpenAI)** - paste a paragraph about your situation and/or upload PDF / image / text documents. The mobile app uploads documents into your private Supabase Storage folder and calls the `analyze-migration` Edge Function, which extracts text, asks the LLM, and returns a ranked plain-English summary. Sign-in is required for this tab; the LLM API key never leaves the Edge Function.

## App flow

- **Home** explains the product and links to start or resume the latest assessment.
- **Assess** runs the guided plain-English questionnaire (offline).
- **AI** is the Assistant tab. Paste text and/or attach docs, then get a ranked AI response.
- **Saved** lists local assessment history (both guided and AI).
- **Guide** is a plain-English visa pathway summary with links to search official Home Affairs information.
- **Info** holds the disclaimer, privacy note, sign-in / sign-out, and local data controls.

## Architecture

```text
src/
  components/ui/              shared UI primitives
  constants/                  colors, spacing, disclaimer text, Supabase env
  data/
    visaOptions.ts            9 deterministic-engine subclasses (offline)
    visaCatalogSeed.ts        22-entry rich catalog seed (mirrors SQL seed)
  navigation/                 stack + bottom tab navigation
  screens/
    Welcome/                  Home tab (with recent migration news)
    Assessment/               offline guided questionnaire
    Results/                  guided assessment result screen
    Assistant/                AI tab (paste text + upload docs)
    AIResults/                AI assessment result screen
    Auth/                     optional Supabase sign-in / sign-up
    Saved/                    unified history (guided + AI)
    Guide/                    visa pathway guide with freshness badges
    Settings/                 disclaimer, account, freshness + manual refresh
  services/
    assessmentEngine.ts       deterministic first-pass eligibility / ranking
    aiAssessment.ts           uploads docs + invokes the Edge Function
    visaCatalog.ts            Supabase-first catalog with seed fallback + cache
    migrationNews.ts          recent migration news with cache + manual refresh
    storage.ts                AsyncStorage persistence for both result kinds
    supabase.ts               Supabase client wired with AsyncStorage
  types/                      TypeScript domain and navigation types
supabase/
  schema.sql                  all tables + RLS + (optional) pg_cron schedules
  seed/visa_subclasses_seed.sql  initial 22-entry catalog
  functions/
    analyze-migration/        AI assessment Edge Function (LLM key only here)
    refresh-visa-data/        weekly refresh of visa_subclasses
    refresh-migration-news/   daily refresh of migration_news
  README.md                   how to apply schema/seed, deploy + cron
```

## Visa data freshness

The catalog has three layers, in order of preference:

1. **Live** - rows in `public.visa_subclasses` with `source = 'live'`, populated by `refresh-visa-data` from Department of Home Affairs pages.
2. **AI-knowledge** - same rows when Home Affairs was unreachable; `refresh-visa-data` falls back to the LLM with explicit "verify on Home Affairs" caveats in `source_notes`.
3. **Seed** - bundled `src/data/visaCatalogSeed.ts`, always available offline.

Refresh runs:

- Automatically every week (visa data) / day (news) via `pg_cron` once you enable the schedule blocks in `supabase/schema.sql`.
- Manually from the Settings tab in the app (signed-in users only, server-side rate-limited).

The `analyze-migration` Edge Function reads the freshest `visa_subclasses` rows before calling the LLM, so AI answers use the freshest available catalog snapshot even when the user's app bundle is months old.

The application uses Expo + TypeScript, React Navigation, centralized domain types and Supabase Edge Functions for optional AI calls.

## Running locally

```powershell
cd migration-pathway-assistant
copy .env.example .env.local   # then edit .env.local with your Supabase project values
npm install
npm run start
```

Then open in Expo Go, Android emulator, iOS simulator, or web.

Useful commands:

```powershell
npm run android
npm run ios
npm run web
npm run typecheck
npm run deploy:functions          # deploy analyze-migration only
npm run deploy:refresh-functions  # deploy refresh-visa-data + refresh-migration-news
```

For the AI Assistant tab to actually return AI responses, follow `supabase/README.md` to apply the schema and set the `OPENAI_API_KEY` (or `LLM_API_KEY` for a free provider) Supabase secret, then deploy the Edge Function.

No backend credentials or populated `.env.local` are supplied. Create your own Supabase project and configure `.env.local` from `.env.example`. For hosted builds, supply the public Supabase URL and anon key through your build environment; `eas.json` contains no project values. Keep privileged service-role and LLM keys server-side.

## Product direction

The app should guide users toward clarity:

1. Identify likely visa categories.
2. Explain why an option may fit.
3. Explain what is missing.
4. Provide a document checklist.
5. Encourage official verification and professional advice for complex cases.

## Important safety notes

- Do not describe results as guaranteed.
- Do not call the app a migration agent or legal adviser.
- Do not store API keys in the app. The OpenAI / LLM key only ever lives in Supabase Edge Function secrets.
- Document upload is gated by sign-in so that Supabase RLS scopes uploads per user; the Edge Function additionally rejects any storage path that is not under the caller's `user_id` folder.
- Keep health and character warnings cautious and referral-oriented.

## Future enhancements

- Image OCR inside the Edge Function (today the function flags images for the user to describe in text).
- PDF / shareable report export.
- Live visa-rule update service (replace static `visaOptions.ts` with a Supabase table).
- Professional consultation booking / referral flow.
- Cross-device sync of guided assessments (currently only AI assessments sync).


## Public release history

This public repository starts from a reviewed source snapshot without historical login details. Earlier development history is retained privately. Use your own backend project, dedicated test account and synthetic documents. Expo/EAS builds must be linked to your own project; no existing project identity or signing credentials are supplied.
