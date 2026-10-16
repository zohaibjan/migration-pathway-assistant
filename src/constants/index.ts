// ──────────────────────────────────────────────────────────
// 2026 redesign — "Tract" theme: deep teal canvas, cream/peach
// card, black pill CTAs, serif headlines. Legacy slate/indigo
// tokens kept as aliases so existing screens keep compiling.
// ──────────────────────────────────────────────────────────
import { Platform } from 'react-native';

export const COLORS = {
  // — New brand palette —
  teal900: '#2E5A50', // deep canvas
  teal800: '#3A6D5F', // canvas (image bg)
  teal700: '#4A8472',
  teal100: '#D9E7E1',
  cream50:  '#FBF4E8', // base card / app surface
  cream100: '#F7EDD9', // warm card
  peach100: '#F6D9C2', // gradient pair for cream cards
  peach200: '#EFC1A1',
  ink900:  '#11140F', // near-black for type + buttons
  ink700:  '#2A2E26',
  ink500:  '#5C5F58',
  ink300:  '#8E9089',
  // — Status (re-tuned warm) —
  mint600: '#3F8C6E',
  mint100: '#D9EBE0',
  amber600: '#B8730F',
  amber100: '#F5E2B8',
  rose600: '#B33A4A',
  rose100: '#F2D6DA',
  // — Indigo / slate aliases (legacy screens still import these) —
  indigo600: '#2E5A50', // mapped to teal900
  indigo500: '#3A6D5F',
  indigo400: '#4A8472',
  indigo100: '#D9E7E1',
  indigo50:  '#EEF5F1',
  violet600: '#3A6D5F',
  sky600: '#3A6D5F',
  sky500: '#4A8472',
  sky100: '#D9E7E1',
  slate900: '#11140F',
  slate700: '#2A2E26',
  slate600: '#5C5F58',
  slate500: '#5C5F58',
  slate400: '#8E9089',
  slate300: '#C9CAC4',
  slate200: '#E4E2D9',
  slate100: '#F1ECDF',
  slate50:  '#FBF4E8',
  white: '#FBF4E8',
  navy900: '#11140F',
  navy800: '#2A2E26',
  navy700: '#3A6D5F',
} as const;

export const GRADIENTS = {
  hero:   ['#FBF4E8', '#F6D9C2'] as const, // cream → peach
  card:   ['#FBF4E8', '#F7EDD9'] as const,
  action: ['#11140F', '#2A2E26'] as const, // ink → ink (button)
  calm:   ['#FBF4E8', '#F7EDD9'] as const, // app-surface base
} as const;

export const FONTS = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }) as string,
  sans:  Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
} as const;

export const RADIUS = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 30,
  full: 999
} as const;

export const APP_DISCLAIMER =
  'Migration Assist provides general information only. It is not legal advice and does not replace advice from a registered migration agent or immigration lawyer.';

// Public-facing legal pages hosted on the company website.
export const PRIVACY_POLICY_URL = 'https://example.com/migration-assist/privacy';
export const SUPPORT_EMAIL = 'support@example.com';

// ──────────────────────────────────────────────────────────
// Supabase config - loaded from EXPO_PUBLIC_* environment vars.
// The anon key is intentionally public-safe (RLS-enforced).
// The OpenAI / LLM key NEVER lives here - it lives only in
// Supabase Edge Function secrets.
// ──────────────────────────────────────────────────────────
export const SUPABASE_URL: string =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY: string =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith('https://') &&
    !SUPABASE_URL.includes('YOUR_PROJECT_REF') &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.includes('your_supabase_anon_key')
  );
}

// Edge Function name - deployed via `supabase functions deploy analyze-migration`.
export const ANALYZE_FUNCTION_NAME = 'analyze-migration';

// Storage bucket for uploaded documents (one folder per user_id).
export const DOCS_BUCKET = 'migration-docs';

// Hard caps for client-side validation (Edge Function re-checks server-side).
export const MAX_DOC_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PASTED_TEXT_CHARS = 12_000;
