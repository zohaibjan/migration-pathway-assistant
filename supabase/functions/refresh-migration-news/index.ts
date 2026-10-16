// ============================================================
// Supabase Edge Function: refresh-migration-news
// ============================================================
// Deploy: supabase functions deploy refresh-migration-news
//
// Pulls recent Australian migration news into public.migration_news.
//
// Strategy:
//   1. Try Migration Alliance and Home Affairs news pages.
//      Many Supabase egress IPs are blocked -> we treat any failure as
//      "source unavailable" and continue.
//   2. If at least one source succeeded, parse a small number of links and
//      upsert into migration_news (deduped by URL).
//   3. If both sources are blocked, ask the LLM to summarise the most recent
//      Australian visa-policy themes from its training data and insert a
//      single "AI summary" row marked clearly so the mobile app can label it.
//
// Triggers:
//   - pg_cron daily (see supabase/schema.sql).
//   - Manual: POST `{ "source": "manual" }` from the Settings screen.
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LLM_PROVIDER = (Deno.env.get('LLM_PROVIDER') ?? 'openai').toLowerCase();
const LLM_API_KEY =
  Deno.env.get('LLM_API_KEY') ?? Deno.env.get('OPENAI_API_KEY') ?? '';
const LLM_MODEL = Deno.env.get('LLM_MODEL') ?? defaultModel(LLM_PROVIDER);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const FETCH_TIMEOUT_MS = 8000;
const MAX_ARTICLES_PER_SOURCE = 8;

function defaultModel(p: string): string {
  if (p === 'gemini') return 'gemini-2.0-flash';
  if (p === 'groq') return 'llama-3.3-70b-versatile';
  return 'gpt-4o-mini';
}

function llmEndpoint(p: string): string {
  if (p === 'gemini')
    return 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
  if (p === 'groq') return 'https://api.groq.com/openai/v1/chat/completions';
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

function sanitize(value: unknown, maxLen: number): string {
  if (typeof value !== 'string' || !value.trim()) return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLen);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

async function fetchWithTimeout(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; MigrationAssistRefresh/1.0; +https://migration-assist)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-AU,en;q=0.9'
      },
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!resp.ok) {
      console.warn(`fetch ${url} -> ${resp.status}`);
      return null;
    }
    return await resp.text();
  } catch (err) {
    console.warn(`fetch ${url} failed:`, (err as Error).message);
    return null;
  }
}

interface ArticleHit {
  url: string;
  title: string;
  source: string;
  summary: string | null;
  published_at: string | null;
  affected_visas: string[];
}

const SUBCLASS_RE = /\bsubclass\s*(\d{3})\b|\bvisa\s*(\d{3})\b/gi;
const COMMON_SUBCLASSES = new Set([
  '189','190','491','482','186','187',
  '500','820','801','309','100','300',
  '485','407','408','600','651','417','462','870','188','888','494','191'
]);

function extractAffectedVisas(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(SUBCLASS_RE)) {
    const code = m[1] ?? m[2];
    if (code && COMMON_SUBCLASSES.has(code)) found.add(code);
  }
  return [...found].sort();
}

// Migration Alliance: simple anchor extraction. We only keep links that look
// like articles (contain /index.php/blog/ or /news/ in the path).
function parseMigrationAlliance(html: string, base: string): ArticleHit[] {
  const out: ArticleHit[] = [];
  const anchorRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  for (const m of html.matchAll(anchorRe)) {
    if (out.length >= MAX_ARTICLES_PER_SOURCE) break;
    let href = m[1] ?? '';
    const text = decodeEntities((m[2] ?? '').replace(/<[^>]+>/g, '')).trim();
    if (!href || !text || text.length < 20) continue;
    if (!/blog|news|article/i.test(href)) continue;
    if (href.startsWith('/')) href = new URL(href, base).toString();
    if (!href.startsWith('http')) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({
      url: href,
      title: sanitize(text, 240),
      source: 'Migration Alliance',
      summary: null,
      published_at: null,
      affected_visas: extractAffectedVisas(text)
    });
  }
  return out;
}

function parseHomeAffairsNews(html: string, base: string): ArticleHit[] {
  const out: ArticleHit[] = [];
  const anchorRe = /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  const seen = new Set<string>();
  for (const m of html.matchAll(anchorRe)) {
    if (out.length >= MAX_ARTICLES_PER_SOURCE) break;
    let href = m[1] ?? '';
    const text = decodeEntities((m[2] ?? '').replace(/<[^>]+>/g, '')).trim();
    if (!href || !text || text.length < 20) continue;
    if (!/news-and-media|newsroom|news\/[\w-]+/i.test(href)) continue;
    if (href.startsWith('/')) href = new URL(href, base).toString();
    if (!href.startsWith('http')) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({
      url: href,
      title: sanitize(text, 240),
      source: 'Home Affairs',
      summary: null,
      published_at: null,
      affected_visas: extractAffectedVisas(text)
    });
  }
  return out;
}

// LLM fallback summary when both sources are unreachable.
async function buildAiNewsFallback(): Promise<ArticleHit[]> {
  if (!LLM_API_KEY) return [];
  const system = `You are an expert Australian migration agent.
Summarise up to 5 of the most material recent themes (last ~12 months) in
Australian visa policy and processing. Each item must be:
- Verifiable in principle (you can name the policy, not invent facts).
- Plain English.
- Conservative on numbers (use ranges or "verify on Home Affairs").
Return STRICT JSON: { "items": [{ "title": "...", "summary": "...", "affected_visas": ["189","482"] }] }`;

  const user = 'Return the JSON now.';
  let raw = '';
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
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.2,
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    });
    if (!resp.ok) return [];
    const json = await resp.json();
    raw = json.choices?.[0]?.message?.content ?? '';
  } catch (err) {
    console.warn('AI news fallback failed:', err);
    return [];
  }
  if (!raw) return [];
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const today = new Date().toISOString().slice(0, 10);
  return items.slice(0, 5).map((item: any, idx: number) => {
    const title = sanitize(item.title, 240) || 'Migration policy theme';
    return {
      url: `ai-summary://${today}/${idx}`,
      title,
      source: 'AI summary',
      summary: sanitize(item.summary, 800) || null,
      published_at: new Date().toISOString(),
      affected_visas: Array.isArray(item.affected_visas)
        ? item.affected_visas
            .filter((v: unknown): v is string => typeof v === 'string')
            .filter((v: string) => COMMON_SUBCLASSES.has(v))
            .slice(0, 8)
        : []
    } satisfies ArticleHit;
  });
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return jsonResponse({ error: 'Missing Supabase env in function.' }, 500);
  }

  let body: Record<string, unknown> = {};
  try {
    if (req.headers.get('content-type')?.includes('application/json')) {
      body = await req.json();
    }
  } catch {
    body = {};
  }
  const triggerSource =
    typeof body.source === 'string' && body.source.trim() ? body.source.trim() : 'unknown';

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const sources: { name: string; base: string; url: string; parser: (html: string, base: string) => ArticleHit[] }[] = [
    {
      name: 'Migration Alliance',
      base: 'https://migrationalliance.com.au',
      url: 'https://migrationalliance.com.au/index.php/migration-news.html',
      parser: parseMigrationAlliance
    },
    {
      name: 'Home Affairs News',
      base: 'https://immi.homeaffairs.gov.au',
      url: 'https://immi.homeaffairs.gov.au/news-and-media/newsroom',
      parser: parseHomeAffairsNews
    }
  ];

  let collected: ArticleHit[] = [];
  const sourceStatus: Record<string, string> = {};
  for (const src of sources) {
    const html = await fetchWithTimeout(src.url);
    if (!html) {
      sourceStatus[src.name] = 'unreachable';
      continue;
    }
    const items = src.parser(html, src.base);
    sourceStatus[src.name] = items.length ? `ok (${items.length})` : 'parsed but no items';
    collected = collected.concat(items);
  }

  let usedFallback = false;
  if (collected.length === 0) {
    const fallback = await buildAiNewsFallback();
    if (fallback.length > 0) {
      usedFallback = true;
      collected = fallback;
    }
  }

  if (collected.length === 0) {
    return jsonResponse(
      {
        inserted: 0,
        message: 'All sources unreachable and AI fallback returned nothing.',
        source_status: sourceStatus
      },
      200
    );
  }

  // Upsert all collected items by URL.
  const rows = collected.map(item => ({
    url: item.url,
    title: item.title,
    source: item.source,
    summary: item.summary,
    affected_visas: item.affected_visas,
    published_at: item.published_at,
    scraped_at: new Date().toISOString()
  }));

  const { error: upsertError, data: upserted } = await admin
    .from('migration_news')
    .upsert(rows, { onConflict: 'url' })
    .select('id');

  if (upsertError) {
    return jsonResponse({ error: upsertError.message }, 500);
  }

  return jsonResponse({
    inserted: upserted?.length ?? 0,
    used_ai_fallback: usedFallback,
    trigger_source: triggerSource,
    source_status: sourceStatus
  });
});
