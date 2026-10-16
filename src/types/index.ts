export type VisaCode = '189' | '190' | '491' | '482' | '186' | '500' | '485' | '820/801' | '600' | '858';

export type EligibilityStatus = 'likely_eligible' | 'possible' | 'not_likely' | 'needs_review';

export interface AssessmentAnswers {
  goal: 'work' | 'study' | 'partner' | 'visit' | 'settle' | 'unsure';
  ageRange: 'under_18' | '18_24' | '25_32' | '33_39' | '40_44' | '45_plus';
  nationality: string;
  location: 'inside_au' | 'outside_au';
  currentVisa: string;
  occupation: string;
  hasSkillsAssessment: boolean;
  englishLevel: 'unknown' | 'functional' | 'competent' | 'proficient' | 'superior';
  yearsExperience: 'none' | 'under_3' | '3_5' | '5_8' | '8_plus';
  qualification: 'none' | 'certificate' | 'diploma' | 'bachelor' | 'masters_phd';
  hasEmployerSponsor: boolean;
  hasStateNomination: boolean;
  regionalWilling: boolean;
  hasAustralianPartner: boolean;
  wantsToStudy: boolean;
  fundsAvailable: boolean;
  healthCharacterConcern: boolean;
}

export interface VisaOption {
  code: VisaCode;
  name: string;
  category: 'Skilled' | 'Employer sponsored' | 'Study' | 'Partner' | 'Visitor' | 'Graduate' | 'Talent';
  summary: string;
  bestFor: string[];
  coreRequirements: string[];
  documents: string[];
  officialSearchHint: string;
}

export interface VisaRecommendation {
  visa: VisaOption;
  status: EligibilityStatus;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  reasons: string[];
  gaps: string[];
  criticalWarnings: string[];
  nextSteps: string[];
}

export interface AssessmentResult {
  id: string;
  createdAt: string;
  title: string;
  answers: AssessmentAnswers;
  recommendations: VisaRecommendation[];
  generalWarnings: string[];
  documentChecklist: string[];
}

// ──────────────────────────────────────────────────────────
// AI Assistant (Edge Function powered) shapes.
// Returned by the analyze-migration Supabase Edge Function.
// All fields are advisory only - never present as legal advice.
// ──────────────────────────────────────────────────────────

export interface AIApplicantProfile {
  name?: string | null;
  nationality?: string | null;
  age_or_dob?: string | null;
  current_location?: string | null;
  current_visa?: string | null;
  english_ability?: string | null;
  occupation?: string | null;
  qualification?: string | null;
  relationship_status?: string | null;
}

export interface AIVisaRecommendation {
  subclass: string;
  name: string;
  category: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
  strengths: string[];
  gaps: string[];
  critical_missing: string[];
  next_steps: string[];
}

export interface AIDocumentIdentified {
  file: string;
  type: string;
  useful_for: string[];
}

export interface AIAnalysisPayload {
  overall_summary: string;
  applicant_profile: AIApplicantProfile;
  recommendations: AIVisaRecommendation[];
  risk_factors: string[];
  documents_identified: AIDocumentIdentified[];
  general_warnings: string[];
}

export interface AIAnalysisResult {
  id: string;
  createdAt: string;
  title: string;
  pastedTextPreview: string;
  documentNames: string[];
  payload: AIAnalysisPayload;
}

export interface AnalyzeRequest {
  pasted_text?: string;
  document_paths?: string[];
  document_names?: string[];
  structured_answers?: Partial<AssessmentAnswers>;
}

// ──────────────────────────────────────────────────────────
// Visa catalog (Supabase-backed with offline seed fallback).
// The deterministic engine uses the narrower VisaOption type;
// the Guide screen and AI grounding use the richer catalog.
// ──────────────────────────────────────────────────────────

export type VisaCatalogSource = 'seed' | 'live' | 'ai-knowledge';

export interface VisaCatalogEntry {
  code: string;
  name: string;
  category: string;
  stream?: string | null;
  summary: string;
  bestFor: string[];
  coreRequirements: string[];
  documents: string[];
  baseFeeAud?: number | null;
  processingTime?: string | null;
  officialSearchHint?: string | null;
  officialUrl?: string | null;
  legislationUrl?: string | null;
  source: VisaCatalogSource;
  sourceNotes?: string | null;
  lastUpdatedAt: string;
  displayOrder?: number;
}

export interface VisaCatalogFreshness {
  source: VisaCatalogSource;
  lastFullRefreshAt: string;
  lastRefreshStatus: string;
  lastRefreshNotes?: string | null;
  nextRefreshDueAt?: string | null;
}

export interface VisaCatalogSnapshot {
  entries: VisaCatalogEntry[];
  freshness: VisaCatalogFreshness;
}

export interface MigrationNewsItem {
  id: string;
  url: string;
  title: string;
  source: string;
  summary?: string | null;
  affectedVisas: string[];
  publishedAt?: string | null;
  scrapedAt: string;
}

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Assessment: { resumeId?: string } | undefined;
  Assistant: undefined;
  Saved: undefined;
  Guide: undefined;
  Settings: undefined;
  Results: { resultId: string };
  AIResults: { resultId: string };
  PrPathway: undefined;
};
