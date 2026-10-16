import type { VisaOption } from '../types';

/**
 * Bundled offline seed of the visa catalog.
 *
 * The same data is also seeded into the Supabase `visa_subclasses` table by
 * `supabase/seed/visa_subclasses_seed.sql`. The mobile app reads from
 * Supabase when online and falls back to this constant when offline (or when
 * the table is empty / unreachable).
 *
 * VISA_OPTIONS_LAST_UPDATED_AT marks when this seed was last hand-curated.
 * Live values returned from `visa_subclasses` will carry their own
 * `last_updated_at` timestamps and should be preferred when newer.
 */
export const VISA_OPTIONS_LAST_UPDATED_AT = '2026-04-26';
export const VISA_OPTIONS_SEED_VERSION = 2;

export const VISA_OPTIONS: VisaOption[] = [
  // ── Skilled ─────────────────────────────────────────────────
  {
    code: '189',
    name: 'Skilled Independent visa',
    category: 'Skilled',
    summary:
      'A points-tested permanent visa for skilled workers who do not need employer or state sponsorship.',
    bestFor: ['Strong points profile', 'Occupation on skilled list', 'Positive skills assessment'],
    coreRequirements: [
      'Usually under 45',
      'Competent English or higher',
      'Skills assessment',
      'Expression of Interest invitation'
    ],
    documents: ['Passport', 'English test', 'Skills assessment', 'Qualifications', 'Employment references', 'CV'],
    officialSearchHint: 'Home Affairs subclass 189 skilled independent visa'
  },
  {
    code: '190',
    name: 'Skilled Nominated visa',
    category: 'Skilled',
    summary: 'A permanent skilled visa requiring nomination by an Australian state or territory.',
    bestFor: ['Skilled applicants open to state nomination', 'Occupation in demand by a state'],
    coreRequirements: [
      'Usually under 45',
      'Skills assessment',
      'State nomination',
      'Commitment to nominating state'
    ],
    documents: [
      'Passport',
      'English test',
      'Skills assessment',
      'State nomination evidence',
      'Qualifications',
      'Employment references'
    ],
    officialSearchHint: 'Home Affairs subclass 190 skilled nominated visa'
  },
  {
    code: '491',
    name: 'Skilled Work Regional visa',
    category: 'Skilled',
    summary:
      'A provisional skilled visa for applicants nominated by a state/territory or sponsored by eligible family in regional Australia.',
    bestFor: ['Applicants willing to live regionally', 'Applicants needing extra regional points'],
    coreRequirements: [
      'Usually under 45',
      'Skills assessment',
      'Regional nomination or family sponsorship',
      'Regional residence obligations'
    ],
    documents: [
      'Passport',
      'English test',
      'Skills assessment',
      'Regional nomination/sponsorship evidence',
      'Qualifications',
      'Employment references'
    ],
    officialSearchHint: 'Home Affairs subclass 491 skilled work regional visa'
  },

  // ── Employer sponsored ─────────────────────────────────────
  {
    code: '482',
    name: 'Temporary Skill Shortage visa',
    category: 'Employer sponsored',
    summary: 'A temporary work visa for skilled workers sponsored by an approved employer.',
    bestFor: ['Applicants with an Australian employer sponsor', 'Occupation aligned with employer role'],
    coreRequirements: [
      'Employer sponsorship',
      'Nominated occupation',
      'Relevant skills and experience',
      'English requirements'
    ],
    documents: [
      'Passport',
      'Employment contract',
      'Employer nomination details',
      'CV',
      'Qualifications',
      'References',
      'English evidence'
    ],
    officialSearchHint: 'Home Affairs subclass 482 skills in demand visa'
  },
  {
    code: '186',
    name: 'Employer Nomination Scheme visa',
    category: 'Employer sponsored',
    summary:
      'A permanent employer-sponsored visa for skilled workers nominated by an Australian employer.',
    bestFor: [
      'Applicants with long-term employer support',
      'Experienced skilled workers seeking permanent residence'
    ],
    coreRequirements: [
      'Employer nomination',
      'Relevant occupation',
      'Skills/experience pathway requirements',
      'Age and English criteria'
    ],
    documents: [
      'Passport',
      'Employer nomination',
      'Employment contract',
      'Skills assessment if required',
      'CV',
      'Qualifications',
      'References'
    ],
    officialSearchHint: 'Home Affairs subclass 186 employer nomination scheme visa'
  },

  // ── Study & graduate ───────────────────────────────────────
  {
    code: '500',
    name: 'Student visa',
    category: 'Study',
    summary: 'A visa for studying an eligible course in Australia.',
    bestFor: ['Applicants with a confirmed course', 'People building an Australian study pathway'],
    coreRequirements: [
      'Confirmation of Enrolment',
      'Genuine student requirement',
      'Financial capacity',
      'Health cover'
    ],
    documents: [
      'Passport',
      'Confirmation of Enrolment',
      'Financial evidence',
      'Genuine student statement',
      'OSHC evidence',
      'Academic records'
    ],
    officialSearchHint: 'Home Affairs subclass 500 student visa'
  },
  {
    code: '485',
    name: 'Temporary Graduate visa',
    category: 'Graduate',
    summary: 'A temporary visa for eligible recent graduates from Australian institutions.',
    bestFor: ['Recent Australian graduates', 'Applicants seeking post-study work experience'],
    coreRequirements: [
      'Recent Australian qualification',
      'Age and English criteria',
      'Australian study requirement',
      'Health insurance'
    ],
    documents: [
      'Passport',
      'Completion letter',
      'Academic transcript',
      'English test',
      'AFP check',
      'Health insurance'
    ],
    officialSearchHint: 'Home Affairs subclass 485 temporary graduate visa'
  },

  // ── Partner ────────────────────────────────────────────────
  {
    code: '820/801',
    name: 'Partner visa',
    category: 'Partner',
    summary:
      'A partner visa pathway for spouses or de facto partners of Australian citizens, permanent residents, or eligible NZ citizens.',
    bestFor: ['Applicants in a genuine relationship with an eligible Australian partner'],
    coreRequirements: [
      'Eligible sponsor',
      'Genuine and continuing relationship',
      'Identity, health and character checks'
    ],
    documents: [
      'Passport',
      'Relationship statement',
      'Marriage/de facto evidence',
      'Joint finances',
      'Joint household evidence',
      'Photos/travel evidence',
      'Police checks'
    ],
    officialSearchHint: 'Home Affairs partner visa subclass 820 801'
  },

  // ── Global Talent ──────────────────────────────────────────
  {
    code: '858',
    name: 'Global Talent visa',
    category: 'Talent',
    summary:
      'A permanent visa for internationally distinguished professionals and researchers in target sectors including AgriFood & AgTech, Health, Energy, Advanced Manufacturing, Defence, Fintech, Quantum/AI, Space, and Education Research.',
    bestFor: [
      'Researchers with Q1/Q2 publications or significant citations',
      'Academics or scientists with international recognition',
      'Professionals in AgriFood, Health, Energy, or Tech sectors',
      'Applicants who cannot easily meet standard points thresholds'
    ],
    coreRequirements: [
      'Distinguished talent in a target sector',
      'Endorsement from a nominating organisation (university, ARC, NHMRC, or peak body)',
      'Evidence of international standing (publications, patents, awards, grants)',
      'No minimum points score required'
    ],
    documents: [
      'Passport',
      'Endorsement letter from nominating organisation',
      'Detailed CV and publication list with citation metrics',
      'Evidence of international recognition (awards, invited talks, grants)',
      'Reference letters from peer professionals',
      'Qualifications transcripts'
    ],
    officialSearchHint: 'Home Affairs subclass 858 Global Talent visa'
  },

  // ── Visitor ────────────────────────────────────────────────
  {
    code: '600',
    name: 'Visitor visa',
    category: 'Visitor',
    summary: 'A temporary visa for tourism, family visits, or short business visitor activities.',
    bestFor: ['Short visits', 'Tourism', 'Family visits', 'Low-risk temporary stay'],
    coreRequirements: [
      'Genuine temporary stay',
      'Sufficient funds',
      'Reasons to return home',
      'Health and character checks'
    ],
    documents: [
      'Passport',
      'Bank statements',
      'Employment/study evidence',
      'Travel itinerary',
      'Invitation letter if visiting family',
      'Home ties evidence'
    ],
    officialSearchHint: 'Home Affairs subclass 600 visitor visa'
  }
];
