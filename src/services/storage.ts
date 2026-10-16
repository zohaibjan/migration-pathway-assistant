import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AIAnalysisResult, AssessmentResult } from '../types';

const RESULTS_KEY = 'migration_assist.results.v1';
const AI_RESULTS_KEY = 'migration_assist.ai_results.v1';
const DISCLAIMER_KEY = 'migration_assist.disclaimer_accepted.v1';
const MAX_RESULTS = 20;

export async function getDisclaimerAccepted(): Promise<boolean> {
  return (await AsyncStorage.getItem(DISCLAIMER_KEY)) === 'true';
}

export async function setDisclaimerAccepted(value: boolean): Promise<void> {
  await AsyncStorage.setItem(DISCLAIMER_KEY, value ? 'true' : 'false');
}

// ─────────── Guided assessment results (deterministic engine) ───────────

export async function loadResults(): Promise<AssessmentResult[]> {
  const raw = await AsyncStorage.getItem(RESULTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AssessmentResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveResult(result: AssessmentResult): Promise<void> {
  const existing = await loadResults();
  const next = [result, ...existing.filter(item => item.id !== result.id)].slice(0, MAX_RESULTS);
  await AsyncStorage.setItem(RESULTS_KEY, JSON.stringify(next));
}

export async function getResult(id: string): Promise<AssessmentResult | null> {
  const results = await loadResults();
  return results.find(item => item.id === id) ?? null;
}

export async function deleteResult(id: string): Promise<void> {
  const results = await loadResults();
  await AsyncStorage.setItem(RESULTS_KEY, JSON.stringify(results.filter(item => item.id !== id)));
}

export async function clearResults(): Promise<void> {
  await AsyncStorage.removeItem(RESULTS_KEY);
}

// ─────────── AI Assistant results (Edge Function powered) ───────────

export async function loadAIResults(): Promise<AIAnalysisResult[]> {
  const raw = await AsyncStorage.getItem(AI_RESULTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as AIAnalysisResult[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveAIResult(result: AIAnalysisResult): Promise<void> {
  const existing = await loadAIResults();
  const next = [result, ...existing.filter(item => item.id !== result.id)].slice(0, MAX_RESULTS);
  await AsyncStorage.setItem(AI_RESULTS_KEY, JSON.stringify(next));
}

export async function getAIResult(id: string): Promise<AIAnalysisResult | null> {
  const results = await loadAIResults();
  return results.find(item => item.id === id) ?? null;
}

export async function deleteAIResult(id: string): Promise<void> {
  const results = await loadAIResults();
  await AsyncStorage.setItem(AI_RESULTS_KEY, JSON.stringify(results.filter(item => item.id !== id)));
}

export async function clearAIResults(): Promise<void> {
  await AsyncStorage.removeItem(AI_RESULTS_KEY);
}
