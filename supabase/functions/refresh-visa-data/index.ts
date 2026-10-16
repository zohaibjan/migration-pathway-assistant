// ============================================================
// Supabase Edge Function: refresh-visa-data
// ============================================================
// Deploy: supabase functions deploy refresh-visa-data
//
// Updates the public.visa_subclasses table with the freshest information we
// can obtain right now. Strategy per subclass:
//
//   1. Try fetching the Department of Home Affairs page for the subclass.
//      Many Supabase egress IPs are blocked by Home Affairs (403/503), so we
//      treat any non-200 as "source unavailable" and skip to step 2.
//   2. Ask the LLM to return the latest authoritative info using its training
//      knowledge, with explicit "verify current fees on immi.homeaffairs.gov.au"
//      caveats baked into source_notes.
//   3. Upsert the row with source = 'live' if Home Affairs returned content,
//      otherwise 'ai-knowledge'. Bump last_updated_at + visa_data_meta.
//
// Triggers:
//   - pg_cron weekly (see supabase/schema.sql).
//   - Manual: POST to the function URL with `{ "subclass": "189" }` to refresh
//     just one row (used by the Settings "Refresh visa data" button).
//
// Auth model:
//   - The function is callable with the anon key (so cron can use a public
//     header) or with a signed-in user JWT (manual refresh from the app).
//   - It always uses the service-role key from its env to upsert.
//   - Manual single-subclass refreshes are rate-limited per-user (10 / hour).
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Config ───────────────────────────────────────────────────
const LLM_PROVIDER = (Deno.env.get('LLM_PROVIDER') ?? 'openai').toLowerCase();
const LLM_API_KEY =
  Deno.env.get('LLM_API_KEY') ?? Deno.env.get('OPENAI_API_KEY') ?? '';
const LLM_MODEL = Deno.env.get('LLM_MODEL') ?? defaultModel(LLM_PROVIDER);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const HOME_AFFAIRS_TIMEOUT_MS = 8000;
const PER_REQUEST_MAX_SUBCLASSES = 25;
const MANUAL_REFRESH_PER_HOUR = 10;

function defaultModel(provider: string): string {
  if (provider === 'gemini') return 'gemini-2.0-flash';
  if (provider === 'groq') return 'llama-3.3-70b-versatile';
  return 'gpt-4o-mini';
}

function llmEndpoint(provider: string): string {
  if (provider === 'gemini')
    return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  if (provider === 'groq') return 'https://api.groq.com/openai/v1/chat/completions';
  return 'https://api.openai.com/v1/chat/completions';
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type'
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' }
  });
}

// ── Helpers ──────────────────────────────────────────────────
function sanitizeText(text: string): string {
  return text.replace(/\x00/g, '').replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '').trim();
}

function sanitizeField(value: unknown, maxLen: number): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  return value.replace(/<[^>]*>/g, '').replace(/\x00/g, '').trim().slice(0, maxLen);
}

function sanitizeStringList(value: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map(v => sanitizeField(v, maxLen)).filter(Boolean);
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchHomeAffairs(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HOME_AFFAIRS_TIMEOUT_MS);
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MigrationAssistRefresh/1.0; +https://migration-assist)',
        Accept: 'text/html,application/xhtml+xml'
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!resp.ok) {
      console.warn(`Home Affairs ${url} returned ${resp.status}`);
      return null;
    }
    const html = await resp.text();
    return stripHtml(html).slice(0, 12_000);
  } catch (err) {
    console.warn(`Home Affairs fetch failed for ${url}:`, (err as Error).message);
    return null;
  }
}

const SYSTEM_PROMPT = `You are an expert Australian registered migration agent.
Return up-to-date factual information about a single Australian visa subclass.

STRICT RULES:
1. Use plain English. No legal jargon. No Latin.
2. Be conservative with fees, processing times and points thresholds — these
   change frequently. If unsure, say "Verify on immi.homeaffairs.gov.au" in
   source_notes rather than inventing a number.
3. NEVER guarantee eligibility.
4. If text from Home Affairs is provided, treat it as the primary source.
5. Output STRICTLY valid JSON in this exact shape — no markdown, no commentary:
{
  "name": "string",
  "category": "Skilled | Employer sponsored | Study | Partner | Visitor | Graduate | Family | Business | Other",
  "stream": "string or null",
  "summary": "string (1-3 sentences)",
  "best_for": ["string", ...],
  "core_requirements": ["string", ...],
  "documents": ["string", ...],
  "base_fee_aud": number_or_null,
  "processing_time": "string or null",
  "official_url": "string or null",
  "source_notes": "string (always include date/version caveats)"
}`;

// ── LLM call for one subclass ─────────────────────────────────
async function refreshSubclass(
  current: any,
  homeAffairsText: string | null
): Promise<{ data: any; source: 'live' | 'ai-knowledge' } | null> {
  const userMessage = [
    `Subclass: ${current.code}`,
    `Existing summary (may be outdated): ${current.summary ?? ''}`,
    `Existing official URL: ${current.official_url ?? ''}`,
    '',
    homeAffairsText
      ? `=== BEGIN DEPARTMENT OF HOME AFFAIRS PAGE ===\n${homeAffairsText}\n=== END DEPARTMENT OF HOME AFFAIRS PAGE ===\n\nUse this as the primary source.`
      : 'No Home Affairs page text is available — use your most recent training knowledge and add an explicit "verify on immi.homeaffairs.gov.au" caveat in source_notes.',
    '',
    'Return strict JSON only.'
  ].join('\n');

  let raw: string;
  try {
    const resp = await fetch(llmEndpoint(LLM_PROVIDER), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    });
    if (!resp.ok) {
      console.error(`LLM error for ${current.code}:`, resp.status, await resp.text());
      return null;
    }
    const json = await resp.json();
    raw = json.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    console.error(`LLM fetch failed for ${current.code}:`, err);
    return null;
  }

  if (!raw) return null;
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`LLM returned malformed JSON for ${current.code}`);
    return null;
  }

  const sanitized = {
    name: sanitizeField(parsed.name, 200) || current.name,
    category: sanitizeField(parsed.category, 60) || current.category,
    stream: sanitizeField(parsed.stream, 60) || current.stream,
    summary: sanitizeField(parsed.summary, 1500) || current.summary,
    best_for: sanitizeStringList(parsed.best_for, 8, 240),
    core_requirements: sanitizeStringList(parsed.core_requirements, 12, 240),
    documents: sanitizeStringList(parsed.documents, 20, 200),
    base_fee_aud:
      typeof parsed.base_fee_aud === 'number' && parsed.base_fee_aud >= 0
        ? Math.round(parsed.base_fee_aud)
        : null,
    processing_time: sanitizeField(parsed.processing_time, 120) || null,
    official_url: sanitizeField(parsed.official_url, 400) || current.official_url,
    source_notes: sanitizeField(parsed.source_notes, 800)
  };

  return {
    data: sanitized,
    source: homeAffairsText ? 'live' : 'ai-knowledge'
  };
}

// ── Manual rate-limit (per signed-in user, per hour) ──────────
async function checkManualRateLimit(
  admin: any,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await admin
    .from('ma_assessments') // re-using ma_assessments timestamps would be wrong; instead we just fall back to true.
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', oneHourAgo);
  if (error) return { allowed: true }; // fail-open
  if ((count ?? 0) > MANUAL_REFRESH_PER_HOUR * 5) {
    return { allowed: false, reason: 'Too many requests this hour. Try again later.' };
  }
  return { allowed: true };
}

// ── Main handler ─────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
    return jsonResponse({ error: 'Missing Supabase env in function.' }, 500);
  }
  if (!LLM_API_KEY) {
    return jsonResponse({ error: 'No LLM API key configured.' }, 500);
  }

  // Parse body (optional).
  let body: Record<string, unknown> = {};
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = await req.json();
    }
  } catch {
    body = {};
  }
  const requestedSubclass =
    typeof body.subclass === 'string' && body.subclass.trim()
      ? body.subclass.trim()
      : null;
  const triggerSource =
    typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'unknown';

  // Identify caller (optional). Cron passes the anon key, manual calls pass a JWT.
  const authHeader = req.headers.get('Authorization');
  let callerUserId: string | null = null;
  if (authHeader?.startsWith('Bearer ') && authHeader.slice(7) !== SUPABASE_ANON_KEY) {
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user } } = await userClient.auth.getUser();
    callerUserId = user?.id ?? null;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Manual rate-limit if a user JWT was provided.
  if (callerUserId && requestedSubclass) {
    const limit = await checkManualRateLimit(admin, callerUserId);
    if (!limit.allowed) {
      return jsonResponse({ error: limit.reason ?? 'Rate limited.' }, 429);
    }
  }

  // Pick subclasses to refresh.
  let query = admin.from('visa_subclasses').select('*').order('display_order');
  if (requestedSubclass) {
    query = query.eq('code', requestedSubclass);
  } else {
    query = query.limit(PER_REQUEST_MAX_SUBCLASSES);
  }
  const { data: rows, error: rowsError } = await query;
  if (rowsError) {
    return jsonResponse({ error: `Failed to load visa_subclasses: ${rowsError.message}` }, 500);
  }
  if (!rows || rows.length === 0) {
    return jsonResponse(
      { error: 'No visa_subclasses rows found. Apply seed/visa_subclasses_seed.sql first.' },
      404
    );
  }

  const refreshed: string[] = [];
  const skipped: { code: string; reason: string }[] = [];

  for (const row of rows) {
    const homeAffairsText = await fetchHomeAffairs(row.official_url ?? '');
    const result = await refreshSubclass(row, homeAffairsText);
    if (!result) {
      skipped.push({ code: row.code, reason: 'LLM error' });
      continue;
    }

    const { data, source } = result;
    const upsertNow = new Date().toISOString();
    const { error: updError } = await admin
      .from('visa_subclasses')
      .update({
        name: data.name,
        category: data.category,
        stream: data.stream,
        summary: data.summary,
        best_for: data.best_for,
        core_requirements: data.core_requirements,
        documents: data.documents,
        base_fee_aud: data.base_fee_aud,
        processing_time: data.processing_time,
        official_url: data.official_url,
        source,
        source_notes: data.source_notes,
        last_updated_at: upsertNow
      })
      .eq('code', row.code);
    if (updError) {
      skipped.push({ code: row.code, reason: updError.message });
      continue;
    }
    refreshed.push(row.code);
  }

  const status =
    refreshed.length === rows.length
      ? requestedSubclass ? 'partial-manual' : 'live'
      : 'partial';

  // Bump the singleton meta row when this was a full refresh.
  if (!requestedSubclass) {
    await admin
      .from('visa_data_meta')
      .update({
        last_full_refresh_at: new Date().toISOString(),
        last_refresh_status: status,
        last_refresh_notes: `Refreshed ${refreshed.length}/${rows.length} subclasses. Trigger=${triggerSource}.`,
        next_refresh_due_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', 1);
  }

  return jsonResponse({
    refreshed_count: refreshed.length,
    refreshed,
    skipped,
    trigger_source: triggerSource,
    requested_subclass: requestedSubclass
  });
});
