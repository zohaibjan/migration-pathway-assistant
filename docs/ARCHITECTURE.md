# Architecture Plan

## Why This Shape

The mobile app is for a broader audience than the current AMA web app. Most users will not know which subclass to choose, which documents matter, or when they should seek professional help. The architecture therefore starts with a deterministic guided assessment rather than an AI chat or document upload flow.

This keeps the first release:

- Fast to test in Expo.
- Safe from client-side secret leakage.
- Predictable for product review.
- Easy to connect to AMA backend later.

## Layers

### Presentation

Screens live under `src/screens/*` and should only coordinate UI, navigation, and service calls.

### Domain Data

`src/data/visaOptions.ts` stores visa pathway definitions:

- Code and name.
- Category.
- Plain-English summary.
- Core requirements.
- Document checklist.
- Official search hint.

Screens should not hard-code visa content.

### Assessment Engine

`src/services/assessmentEngine.ts` scores visa pathways using typed answers. It returns:

- Ranked recommendations.
- Eligibility status.
- Reasons the pathway may fit.
- Gaps.
- Critical warnings.
- Next steps.
- Combined document checklist.

This should remain deterministic and testable. If AI is added later, treat it as enrichment, not as the only source of recommendation logic.

### Persistence

`src/services/storage.ts` wraps AsyncStorage. Current storage is local-only:

- Disclaimer accepted flag.
- Saved assessment results.

### Future Backend

Future backend calls should be isolated in `src/services/api.ts`. The mobile app must never contain privileged keys.

## Recommended Future Milestones

1. Add unit tests for `assessmentEngine.ts`.
2. Add PDF/share export for results.
3. Add backend-powered visa data refresh.
4. Add optional AI context analysis.
5. Add document upload/OCR only after a privacy review.
6. Add account sync only if user value is clear.
