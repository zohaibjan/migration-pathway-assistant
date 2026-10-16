import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured } from '../constants';

function supabaseErrMsg(err: { message?: string; code?: string } | null | undefined): string {
  if (!err) return 'unknown error';
  const raw = err.message ?? '';
  // When the project is paused/unreachable Supabase returns a 521 HTML page.
  // Detect it and log a clean single-line message instead of dumping the HTML.
  if (raw.includes('521') || raw.includes('Web server is down')) {
    return 'Supabase project is unreachable (521 - project may be paused). Falling back to cached/seed data.';
  }
  if (raw.includes('Failed to fetch') || raw.includes('NetworkError') || raw.includes('ECONNREFUSED')) {
    return 'Network unavailable. Falling back to cached/seed data.';
  }
  // Truncate long messages (e.g. full HTML bodies) to keep logs readable.
  return raw.length > 200 ? `${raw.slice(0, 200)}...` : raw;
}
import {
  VISA_CATALOG_SEED,
  VISA_CATALOG_SEED_AT
} from '../data/visaCatalogSeed';
import type {
  VisaCatalogEntry,
  VisaCatalogFreshness,
  VisaCatalogSnapshot,
  VisaCatalogSource
} from '../types';
import { supabase } from './supabase';

const CACHE_KEY = 'migration_assist.visa_catalog.v1';
const FRESHNESS_KEY = 'migration_assist.visa_catalog_freshness.v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedSnapshot {
  cachedAt: number;
  snapshot: VisaCatalogSnapshot;
}

const SEED_FRESHNESS: VisaCatalogFreshness = {
  source: 'seed',
  lastFullRefreshAt: VISA_CATALOG_SEED_AT,
  lastRefreshStatus: 'seed',
  lastRefreshNotes: 'Bundled offline seed - no Supabase fetch yet.',
  nextRefreshDueAt: null
};

export const SEED_SNAPSHOT: VisaCatalogSnapshot = {
  entries: [...VISA_CATALOG_SEED].sort(byDisplayOrder),
  freshness: SEED_FRESHNESS
};

function byDisplayOrder(a: VisaCatalogEntry, b: VisaCatalogEntry): number {
  const ao = a.displayOrder ?? 9999;
  const bo = b.displayOrder ?? 9999;
  if (ao !== bo) return ao - bo;
  return a.code.localeCompare(b.code);
}

/**
 * Load the visa catalog using Supabase when available, AsyncStorage cache
 * when fresh, and the bundled seed as last resort.
 *
 * Order of preference:
 *   1. Live Supabase fetch (when online + configured).
 *   2. AsyncStorage cache (under TTL).
 *   3. Bundled seed (always works).
 */
export async function loadVisaCatalog(opts: { force?: boolean } = {}): Promise<VisaCatalogSnapshot> {
  if (!isSupabaseConfigured()) {
    return SEED_SNAPSHOT;
  }

  if (!opts.force) {
    const cached = await readCache();
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
      // Kick off a background refresh but return the cached value immediately.
      void fetchAndCache().catch(() => undefined);
      return cached.snapshot;
    }
  }

  const fresh = await fetchAndCache();
  if (fresh) return fresh;

  const cached = await readCache();
  if (cached) return cached.snapshot;
  return SEED_SNAPSHOT;
}

/**
 * Returns the most recent freshness metadata we have, even if it's only the
 * seed. Used by Settings to display "Visa data: X days old (seed/live)".
 */
export async function loadVisaCatalogFreshness(): Promise<VisaCatalogFreshness> {
  const raw = await AsyncStorage.getItem(FRESHNESS_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as VisaCatalogFreshness;
      if (parsed && parsed.lastFullRefreshAt) return parsed;
    } catch {
      // fall through
    }
  }
  return SEED_FRESHNESS;
}

async function readCache(): Promise<CachedSnapshot | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedSnapshot;
    if (parsed && Array.isArray(parsed.snapshot?.entries)) return parsed;
  } catch {
    // fall through
  }
  return null;
}

async function fetchAndCache(): Promise<VisaCatalogSnapshot | null> {
  try {
    const [{ data: rows, error: rowsError }, { data: meta, error: metaError }] = await Promise.all([
      supabase
        .from('visa_subclasses')
        .select(
          'code, name, category, stream, summary, best_for, core_requirements, documents, base_fee_aud, processing_time, official_search_hint, official_url, legislation_url, source, source_notes, last_updated_at, display_order'
        )
        .order('display_order'),
      supabase
        .from('visa_data_meta')
        .select('last_full_refresh_at, last_refresh_status, last_refresh_notes, next_refresh_due_at')
        .eq('id', 1)
        .maybeSingle()
    ]);

    if (rowsError) {
      console.warn('[visaCatalog]', supabaseErrMsg(rowsError));
      return null;
    }
    if (!rows || rows.length === 0) {
      console.warn('[visaCatalog] supabase returned no rows; using seed.');
      return null;
    }

    const entries: VisaCatalogEntry[] = rows.map(rowToEntry).sort(byDisplayOrder);
    const overallSource = pickOverallSource(entries);
    const freshness: VisaCatalogFreshness = {
      source: overallSource,
      lastFullRefreshAt:
        meta?.last_full_refresh_at ??
        entries.reduce(
          (acc, e) => (e.lastUpdatedAt > acc ? e.lastUpdatedAt : acc),
          entries[0]?.lastUpdatedAt ?? VISA_CATALOG_SEED_AT
        ),
      lastRefreshStatus: meta?.last_refresh_status ?? overallSource,
      lastRefreshNotes: meta?.last_refresh_notes ?? null,
      nextRefreshDueAt: meta?.next_refresh_due_at ?? null
    };

    if (metaError) {
      console.warn('[visaCatalog] meta error (non-fatal):', metaError.message);
    }

    const snapshot: VisaCatalogSnapshot = { entries, freshness };
    await writeCache(snapshot);
    return snapshot;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const clean = msg.includes('521') || msg.includes('Web server is down')
      ? 'Supabase project unreachable (521). Using cached/seed data.'
      : msg.length > 200 ? `${msg.slice(0, 200)}...` : msg;
    console.warn('[visaCatalog] fetch failed:', clean);
    return null;
  }
}

function rowToEntry(row: Record<string, unknown>): VisaCatalogEntry {
  return {
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    category: String(row.category ?? 'Other'),
    stream: (row.stream as string | null) ?? null,
    summary: String(row.summary ?? ''),
    bestFor: Array.isArray(row.best_for) ? (row.best_for as string[]) : [],
    coreRequirements: Array.isArray(row.core_requirements)
      ? (row.core_requirements as string[])
      : [],
    documents: Array.isArray(row.documents) ? (row.documents as string[]) : [],
    baseFeeAud: typeof row.base_fee_aud === 'number' ? row.base_fee_aud : null,
    processingTime: (row.processing_time as string | null) ?? null,
    officialSearchHint: (row.official_search_hint as string | null) ?? null,
    officialUrl: (row.official_url as string | null) ?? null,
    legislationUrl: (row.legislation_url as string | null) ?? null,
    source: (row.source as VisaCatalogSource) ?? 'live',
    sourceNotes: (row.source_notes as string | null) ?? null,
    lastUpdatedAt: String(row.last_updated_at ?? new Date().toISOString()),
    displayOrder:
      typeof row.display_order === 'number' ? row.display_order : undefined
  };
}

function pickOverallSource(entries: VisaCatalogEntry[]): VisaCatalogSource {
  if (entries.some(e => e.source === 'live')) return 'live';
  if (entries.some(e => e.source === 'ai-knowledge')) return 'ai-knowledge';
  return 'seed';
}

async function writeCache(snapshot: VisaCatalogSnapshot): Promise<void> {
  try {
    const cached: CachedSnapshot = { cachedAt: Date.now(), snapshot };
    await Promise.all([
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached)),
      AsyncStorage.setItem(FRESHNESS_KEY, JSON.stringify(snapshot.freshness))
    ]);
  } catch (err) {
    console.warn('[visaCatalog] cache write failed:', err);
  }
}

/**
 * Manual trigger of refresh-visa-data Edge Function. Returns a summary that
 * the Settings screen can render. Requires a signed-in user (the function
 * applies a per-user rate limit).
 */
export interface RefreshOutcome {
  ok: boolean;
  message: string;
  refreshedCount?: number;
  triggeredAt: string;
}

export async function refreshVisaCatalogNow(): Promise<RefreshOutcome> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      message: 'Supabase is not configured.',
      triggeredAt: new Date().toISOString()
    };
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    return {
      ok: false,
      message: 'Sign in to refresh the visa catalog.',
      triggeredAt: new Date().toISOString()
    };
  }

  try {
    const { data, error } = await supabase.functions.invoke<{
      refreshed_count?: number;
      refreshed?: string[];
      skipped?: { code: string; reason: string }[];
    }>('refresh-visa-data', {
      body: { source: 'manual-mobile' }
    });

    if (error) {
      return {
        ok: false,
        message: error.message ?? 'Refresh failed.',
        triggeredAt: new Date().toISOString()
      };
    }

    // Force a fresh fetch so the local cache picks up the new rows.
    await loadVisaCatalog({ force: true });

    return {
      ok: true,
      refreshedCount: data?.refreshed_count ?? 0,
      message: `Refreshed ${data?.refreshed_count ?? 0} visa subclasses.`,
      triggeredAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Refresh failed.',
      triggeredAt: new Date().toISOString()
    };
  }
}

export async function clearVisaCatalogCache(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(CACHE_KEY),
    AsyncStorage.removeItem(FRESHNESS_KEY)
  ]);
}
