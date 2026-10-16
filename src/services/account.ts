import { supabase } from './supabase';
import { clearAIResults, clearResults } from './storage';

export interface DeleteAccountSuccess {
  ok: true;
  filesRemoved: number;
}

export interface DeleteAccountFailure {
  ok: false;
  reason: 'NOT_SIGNED_IN' | 'SERVER_ERROR' | 'NETWORK_ERROR';
  message: string;
}

export type DeleteAccountOutcome = DeleteAccountSuccess | DeleteAccountFailure;

const DELETE_FUNCTION_NAME = 'delete-account';

/**
 * Permanently delete the signed-in user's account.
 *
 * Calls the `delete-account` Edge Function (which holds the service-role key
 * needed to wipe Storage, assessment rows, and the auth user), then clears the
 * local session and on-device data so nothing lingers after deletion.
 */
export async function deleteAccount(): Promise<DeleteAccountOutcome> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user?.id) {
    return {
      ok: false,
      reason: 'NOT_SIGNED_IN',
      message: 'You need to be signed in to delete your account.'
    };
  }

  let filesRemoved = 0;
  try {
    const { data, error } = await supabase.functions.invoke<{
      ok?: boolean;
      files_removed?: number;
      error?: string;
    }>(DELETE_FUNCTION_NAME, { body: {} });

    if (error) {
      const maybe = error as { context?: { error?: string }; message?: string };
      return {
        ok: false,
        reason: 'SERVER_ERROR',
        message: maybe.context?.error ?? maybe.message ?? 'Could not delete your account. Please try again.'
      };
    }
    if (!data?.ok) {
      return {
        ok: false,
        reason: 'SERVER_ERROR',
        message: data?.error ?? 'Could not delete your account. Please try again.'
      };
    }
    filesRemoved = data.files_removed ?? 0;
  } catch (err) {
    return {
      ok: false,
      reason: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Could not reach the server. Check your connection.'
    };
  }

  // Account is gone server-side — clear the local session and on-device data.
  await supabase.auth.signOut().catch(() => {});
  await Promise.all([clearResults(), clearAIResults()]).catch(() => {});

  return { ok: true, filesRemoved };
}
