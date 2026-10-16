import {
  ANALYZE_FUNCTION_NAME,
  DOCS_BUCKET,
  MAX_DOC_BYTES,
  MAX_PASTED_TEXT_CHARS
} from '../constants';
import type {
  AIAnalysisPayload,
  AIAnalysisResult,
  AnalyzeRequest,
  AssessmentAnswers
} from '../types';
import { saveAIResult } from './storage';
import { supabase } from './supabase';

export interface PickedDocument {
  uri: string;
  name: string;
  size?: number | null;
  mimeType?: string | null;
}

export interface AnalyzeOptions {
  pastedText?: string;
  documents?: PickedDocument[];
  structuredAnswers?: Partial<AssessmentAnswers>;
}

export interface AnalyzeOutcome {
  ok: true;
  result: AIAnalysisResult;
}

export interface AnalyzeFailure {
  ok: false;
  reason:
    | 'NOT_SIGNED_IN'
    | 'NO_INPUT'
    | 'TEXT_TOO_LONG'
    | 'DOC_TOO_LARGE'
    | 'UPLOAD_FAILED'
    | 'AI_ERROR'
    | 'NETWORK_ERROR';
  message: string;
}

export type AnalyzeResultEnvelope = AnalyzeOutcome | AnalyzeFailure;

/**
 * Run the AI Assistant flow:
 *   1. Validate inputs client-side.
 *   2. Upload any picked documents to the user's Supabase Storage folder.
 *   3. Invoke the analyze-migration Edge Function (which holds the LLM key).
 *   4. Save the returned analysis to local storage so it shows in Saved.
 *
 * The Edge Function re-validates everything server-side and is the only
 * place the OpenAI key is ever used.
 */
export async function runAIAssessment(opts: AnalyzeOptions): Promise<AnalyzeResultEnvelope> {
  const { pastedText, documents, structuredAnswers } = opts;
  const trimmedText = (pastedText ?? '').trim();
  const docs = documents ?? [];

  if (!trimmedText && docs.length === 0) {
    return {
      ok: false,
      reason: 'NO_INPUT',
      message: 'Add some text about your situation or attach a document to analyze.'
    };
  }

  if (trimmedText.length > MAX_PASTED_TEXT_CHARS) {
    return {
      ok: false,
      reason: 'TEXT_TOO_LONG',
      message: `Pasted text is too long. Keep it under ${MAX_PASTED_TEXT_CHARS.toLocaleString()} characters.`
    };
  }

  for (const doc of docs) {
    if (typeof doc.size === 'number' && doc.size > MAX_DOC_BYTES) {
      return {
        ok: false,
        reason: 'DOC_TOO_LARGE',
        message: `${doc.name} is larger than ${(MAX_DOC_BYTES / 1024 / 1024).toFixed(0)} MB. Please pick a smaller file.`
      };
    }
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session?.user?.id) {
    return {
      ok: false,
      reason: 'NOT_SIGNED_IN',
      message: 'Sign in to use AI document analysis. Your guided assessment still works without an account.'
    };
  }

  const userId = session.user.id;

  const documentPaths: string[] = [];
  const documentNames: string[] = [];
  try {
    for (const doc of docs) {
      const path = await uploadDocument(userId, doc);
      documentPaths.push(path);
      documentNames.push(doc.name);
    }
  } catch (err) {
    return {
      ok: false,
      reason: 'UPLOAD_FAILED',
      message: err instanceof Error ? err.message : 'Failed to upload one of your documents.'
    };
  }

  const body: AnalyzeRequest = {
    pasted_text: trimmedText || undefined,
    document_paths: documentPaths.length ? documentPaths : undefined,
    document_names: documentNames.length ? documentNames : undefined,
    structured_answers: structuredAnswers
  };

  let payload: AIAnalysisPayload;
  try {
    const { data, error } = await supabase.functions.invoke<AIAnalysisPayload>(
      ANALYZE_FUNCTION_NAME,
      { body }
    );
    if (error) {
      return {
        ok: false,
        reason: 'AI_ERROR',
        message: extractFunctionError(error)
      };
    }
    if (!data) {
      return {
        ok: false,
        reason: 'AI_ERROR',
        message: 'The AI service returned an empty response. Please try again.'
      };
    }
    payload = normalizePayload(data);
  } catch (err) {
    return {
      ok: false,
      reason: 'NETWORK_ERROR',
      message: err instanceof Error ? err.message : 'Could not reach the AI service.'
    };
  }

  const result: AIAnalysisResult = {
    id: Date.now().toString(36),
    createdAt: new Date().toISOString(),
    title: makeTitle(trimmedText, documentNames),
    pastedTextPreview: trimmedText.slice(0, 280),
    documentNames,
    payload
  };

  await saveAIResult(result);
  return { ok: true, result };
}

async function uploadDocument(userId: string, doc: PickedDocument): Promise<string> {
  const safeName = doc.name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_')
    .slice(0, 80) || 'document';
  const path = `${userId}/${Date.now()}-${safeName}`;

  let blob: Blob;
  try {
    const fetchResp = await fetch(doc.uri);
    if (!fetchResp.ok && fetchResp.status !== 0) {
      throw new Error(`HTTP ${fetchResp.status} fetching ${doc.name}`);
    }
    blob = await fetchResp.blob();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    throw new Error(`Could not read ${doc.name}: ${msg}`);
  }

  if (typeof blob.size === 'number' && blob.size > MAX_DOC_BYTES) {
    throw new Error(`${doc.name} is larger than the upload limit.`);
  }

  const { error } = await supabase.storage.from(DOCS_BUCKET).upload(path, blob, {
    contentType: doc.mimeType ?? blob.type ?? 'application/octet-stream',
    upsert: false
  });
  if (error) throw new Error(error.message);
  return path;
}

function extractFunctionError(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybe = error as { message?: string; context?: { error?: string } };
    if (maybe.context?.error) return maybe.context.error;
    if (maybe.message) return maybe.message;
  }
  return 'AI service error. Please try again in a moment.';
}

function makeTitle(text: string, docNames: string[]): string {
  const baseFromText = text
    .split(/\s+/)
    .slice(0, 8)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (baseFromText) {
    return baseFromText.length > 60 ? `${baseFromText.slice(0, 57)}...` : baseFromText;
  }
  if (docNames.length) {
    return docNames.length === 1 ? docNames[0]! : `${docNames[0]} +${docNames.length - 1}`;
  }
  return 'AI assessment';
}

function normalizePayload(input: unknown): AIAnalysisPayload {
  const obj = (input ?? {}) as Partial<AIAnalysisPayload> & Record<string, unknown>;
  return {
    overall_summary: typeof obj.overall_summary === 'string' ? obj.overall_summary : '',
    applicant_profile: (obj.applicant_profile ?? {}) as AIAnalysisPayload['applicant_profile'],
    recommendations: Array.isArray(obj.recommendations)
      ? (obj.recommendations as AIAnalysisPayload['recommendations'])
      : [],
    risk_factors: Array.isArray(obj.risk_factors) ? (obj.risk_factors as string[]) : [],
    documents_identified: Array.isArray(obj.documents_identified)
      ? (obj.documents_identified as AIAnalysisPayload['documents_identified'])
      : [],
    general_warnings: Array.isArray(obj.general_warnings)
      ? (obj.general_warnings as string[])
      : [
          'Visa rules change frequently. Always verify against immi.homeaffairs.gov.au before acting.',
          'This is general guidance only, not legal advice.'
        ]
  };
}
