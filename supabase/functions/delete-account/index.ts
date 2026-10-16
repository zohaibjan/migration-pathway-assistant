// ============================================================
// Supabase Edge Function: delete-account  v1.0
// ============================================================
// Permanently deletes the calling user's account and all of their
// data, satisfying the Apple App Store requirement (Guideline 5.1.1(v))
// that any app offering account creation also offers in-app deletion.
//
// Deploy: supabase functions deploy delete-account
//
// Required secrets (already set for analyze-migration):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
//   (these are injected automatically for deployed functions)
//
// What it does, in order:
//   1. Verifies the caller's JWT.
//   2. Removes every uploaded document under `${user_id}/` in the
//      private migration-docs Storage bucket.
//   3. Deletes the user's ma_assessments rows.
//   4. Deletes the auth user (admin API). The auth.users -> ma_assessments
//      FK cascade also covers (3); we delete explicitly first so storage
//      and table cleanup is verifiable in logs.
//
// Security: JWT required; a user can only ever delete their own account
//   because the uid is read from the verified token, never from the body.
// ============================================================

// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const DOCS_BUCKET = 'migration-docs';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' }
  });
}

// List every object under a user's folder (handles nested paths + paging).
async function listAllUserFiles(admin: any, uid: string): Promise<string[]> {
  const paths: string[] = [];
  const stack = [uid];
  while (stack.length) {
    const prefix = stack.pop()!;
    let offset = 0;
    // Page through in case a user has many files.
    // deno-lint-ignore no-constant-condition
    while (true) {
      const { data, error } = await admin.storage
        .from(DOCS_BUCKET)
        .list(prefix, { limit: 100, offset });
      if (error) throw new Error(`storage list failed: ${error.message}`);
      if (!data || data.length === 0) break;
      for (const entry of data) {
        const full = `${prefix}/${entry.name}`;
        // Folders come back with a null id; recurse into them.
        if (entry.id === null && entry.metadata == null) stack.push(full);
        else paths.push(full);
      }
      if (data.length < 100) break;
      offset += data.length;
    }
  }
  return paths;
}

serve(async (req: Request) => {
  try {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return jsonResp({ error: 'Method not allowed' }, 405);

    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY) {
      return jsonResp({ error: 'Edge function missing Supabase environment variables.' }, 500);
    }

    // ── 1. Verify JWT ─────────────────────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResp({ error: 'Unauthorized' }, 401);
    const token = authHeader.slice(7);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return jsonResp({ error: 'Unauthorized' }, 401);
    const uid = user.id;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ── 2. Scrub uploaded documents ───────────────────────────
    let filesRemoved = 0;
    try {
      const files = await listAllUserFiles(admin, uid);
      if (files.length) {
        const { error: rmErr } = await admin.storage.from(DOCS_BUCKET).remove(files);
        if (rmErr) throw new Error(rmErr.message);
        filesRemoved = files.length;
      }
    } catch (e) {
      console.error('Document scrub failed:', e);
      return jsonResp({ error: 'Could not remove your uploaded files. Account not deleted — please try again.' }, 500);
    }

    // ── 3. Delete assessment rows ─────────────────────────────
    try {
      const { error: delErr } = await admin.from('ma_assessments').delete().eq('user_id', uid);
      if (delErr) throw new Error(delErr.message);
    } catch (e) {
      console.error('ma_assessments delete failed:', e);
      return jsonResp({ error: 'Could not remove your saved assessments. Account not deleted — please try again.' }, 500);
    }

    // ── 4. Delete the auth user ───────────────────────────────
    const { error: userDelErr } = await admin.auth.admin.deleteUser(uid);
    if (userDelErr) {
      console.error('auth.admin.deleteUser failed:', userDelErr);
      return jsonResp({ error: 'Could not delete your account. Please try again or contact support.' }, 500);
    }

    return jsonResp({ ok: true, files_removed: filesRemoved });
  } catch (err) {
    console.error('Unhandled delete-account error:', err);
    return jsonResp({ error: 'Internal server error.' }, 500);
  }
});
