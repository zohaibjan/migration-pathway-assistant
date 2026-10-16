import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured } from '../constants';

function cleanErr(err: { message?: string } | null | undefined): string {
  const raw = err?.message ?? '';
  if (raw.includes('521') || raw.includes('Web server is down')) {
    return 'Supabase project unreachable (521 - project may be paused).';
  }
  if (raw.includes('Failed to fetch') || raw.includes('NetworkError')) {
    return 'Network unavailable.';
  }
  return raw.length > 200 ? `${raw.slice(0, 200)}...` : raw;
}
import type { MigrationNewsItem } from '../types';
import { supabase } from './supabase';

const NEWS_CACHE_KEY = 'migration_assist.news.v1';
const NEWS_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

interface CachedNews {
  cachedAt: number;
  items: MigrationNewsItem[];
}

export async function loadRecentNews(opts: { limit?: number; force?: boolean } = {}): Promise<MigrationNewsItem[]> {
  const limit = opts.limit ?? 10;

  if (!isSupabaseConfigured()) {
    return [];
  }

  if (!opts.force) {
    const cached = await readCache();
    if (cached && Date.now() - cached.cachedAt < NEWS_CACHE_TTL_MS) {
      void fetchAndCache(limit).catch(() => undefined);
      return cached.items.slice(0, limit);
    }
  }

  const fresh = await fetchAndCache(limit);
  if (fresh) return fresh;

  const cached = await readCache();
  return cached?.items.slice(0, limit) ?? [];
}

async function fetchAndCache(limit: number): Promise<MigrationNewsItem[] | null> {
  try {
    const { data, error } = await supabase
      .from('migration_news')
      .select('id, url, title, source, summary, affected_visas, published_at, scraped_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('scraped_at', { ascending: false })
      .limit(Math.max(limit, 20));
    if (error) {
      console.warn('[migrationNews] fetch error:', cleanErr(error));
      return null;
    }
    if (!data) return [];
    const items: MigrationNewsItem[] = data.map(row => ({
      id: String(row.id),
      url: String(row.url),
      title: String(row.title),
      source: String(row.source),
      summary: (row.summary as string | null) ?? null,
      affectedVisas: Array.isArray(row.affected_visas)
        ? (row.affected_visas as string[])
        : [],
      publishedAt: (row.published_at as string | null) ?? null,
      scrapedAt: String(row.scraped_at)
    }));
    await AsyncStorage.setItem(
      NEWS_CACHE_KEY,
      JSON.stringify({ cachedAt: Date.now(), items } satisfies CachedNews)
    );
    return items.slice(0, limit);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const clean = msg.includes('521') || msg.includes('Web server is down')
      ? 'Supabase project unreachable (521). Using cache.'
      : msg.length > 200 ? `${msg.slice(0, 200)}...` : msg;
    console.warn('[migrationNews] fetch failed:', clean);
    return null;
  }
}

async function readCache(): Promise<CachedNews | null> {
  const raw = await AsyncStorage.getItem(NEWS_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CachedNews;
    if (parsed && Array.isArray(parsed.items)) return parsed;
  } catch {
    // fall through
  }
  return null;
}

export async function refreshMigrationNewsNow(): Promise<{ ok: boolean; message: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, message: 'Supabase is not configured.' };
  }
  try {
    const { data, error } = await supabase.functions.invoke<{ inserted?: number; used_ai_fallback?: boolean }>(
      'refresh-migration-news',
      { body: { source: 'manual-mobile' } }
    );
    if (error) return { ok: false, message: error.message ?? 'Refresh failed.' };
    await loadRecentNews({ force: true });
    const inserted = data?.inserted ?? 0;
    const fallback = data?.used_ai_fallback ? ' (AI summary fallback used)' : '';
    return { ok: true, message: `Updated migration news.${fallback} ${inserted} items.` };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Refresh failed.'
    };
  }
}
