# Development and deployment boundary

This repository is a source-code portfolio prototype. No hosted app, store listing, existing Expo project, backend credentials or production deployment is supplied.

## Local development

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and configure a project you control.
3. Run `npm run start` and open the app in a compatible Expo development environment.
4. Use synthetic inputs. Review the README's information-quality and privacy limitations.

The guided path works locally. Optional AI analysis requires your own Supabase project and server-side provider configuration; see `../supabase/README.md`.

## Before any hosted deployment

Configure your own app identifiers, Expo project, signing credentials, backend, access controls, rate limits and legal/support pages. URLs and app identifiers in this public version are placeholders. Review current provider and app-store documentation for your intended environment.

Operational launch checklists and browser tests targeting earlier hosted builds are not part of this public source snapshot.
