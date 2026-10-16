import type { VisaCatalogEntry } from '../types';

/**
 * Bundled offline mirror of public.visa_subclasses. Kept in sync with
 * supabase/seed/visa_subclasses_seed.sql. Used as the offline / fallback
 * catalog when Supabase is unreachable or empty.
 *
 * VISA_CATALOG_SEED_AT marks when this constant was last hand-curated.
 * Live rows from Supabase carry their own `lastUpdatedAt` and override
 * these values whenever they're fresher.
 */
export const VISA_CATALOG_SEED_AT = '2026-04-26T00:00:00.000Z';

export const VISA_CATALOG_SEED: VisaCatalogEntry[] = [
  // ── Skilled ─────────────────────────────────────────────
  {
    code: '189',
    name: 'Skilled Independent visa',
    category: 'Skilled',
    stream: 'points-tested',
    summary:
      'Permanent visa for skilled workers who do not need employer or state sponsorship.',
    bestFor: ['Strong points profile', 'Occupation on skilled list', 'Positive skills assessment'],
    coreRequirements: [
      'Usually under 45',
      'Competent English or higher',
      'Skills assessment',
      'Expression of Interest invitation'
    ],
    documents: ['Passport', 'English test', 'Skills assessment', 'Qualifications', 'Employment references', 'CV'],
    baseFeeAud: 4640,
    processingTime: '6-29 months',
    officialSearchHint: 'Home Affairs subclass 189 skilled independent visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-independent-189',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py and Home Affairs published fees.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 10
  },
  {
    code: '190',
    name: 'Skilled Nominated visa',
    category: 'Skilled',
    stream: 'state-nominated',
    summary: 'Permanent skilled visa requiring nomination by an Australian state or territory.',
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
    baseFeeAud: 4640,
    processingTime: '7-12 months',
    officialSearchHint: 'Home Affairs subclass 190 skilled nominated visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-nominated-190',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 11
  },
  {
    code: '491',
    name: 'Skilled Work Regional (Provisional) visa',
    category: 'Skilled',
    stream: 'regional',
    summary:
      'Provisional skilled visa for applicants nominated by a state/territory or sponsored by eligible family in regional Australia.',
    bestFor: ['Applicants willing to live regionally', 'Applicants needing extra regional points'],
    coreRequirements: [
      'Usually under 45',
      'Skills assessment',
      'Regional nomination or family sponsorship',
      'Live and work in regional Australia'
    ],
    documents: [
      'Passport',
      'English test',
      'Skills assessment',
      'Regional nomination/sponsorship evidence',
      'Qualifications',
      'Employment references'
    ],
    baseFeeAud: 4640,
    processingTime: '6-12 months',
    officialSearchHint: 'Home Affairs subclass 491 skilled work regional visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-work-regional-provisional-491',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 12
  },
  {
    code: '191',
    name: 'Permanent Residence (Skilled Regional) visa',
    category: 'Skilled',
    stream: 'regional-pr',
    summary:
      'Permanent visa for 491 or 494 holders who have lived and worked in regional Australia for 3+ years.',
    bestFor: ['Subclass 491 or 494 holders meeting regional residence rules'],
    coreRequirements: [
      '3 years on a 491 or 494',
      'Minimum taxable income for 3 years',
      'Compliance with regional conditions'
    ],
    documents: [
      'Passport',
      '491 or 494 grant evidence',
      'ATO income statements',
      'Regional residence evidence'
    ],
    baseFeeAud: 525,
    processingTime: 'Varies',
    officialSearchHint: 'Home Affairs subclass 191 permanent residence skilled regional',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-regional-191',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 13
  },

  // ── Employer sponsored ─────────────────────────────────
  {
    code: '482',
    name: 'Skills in Demand visa (formerly TSS)',
    category: 'Employer sponsored',
    stream: 'employer',
    summary:
      'Temporary work visa for skilled workers sponsored by an approved Australian employer.',
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
    baseFeeAud: 3210,
    processingTime: '1-4 months',
    officialSearchHint: 'Home Affairs subclass 482 skills in demand visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skills-in-demand-482',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes:
      'Subclass 482 was rebranded from Temporary Skill Shortage to Skills in Demand in late 2024. Verify current stream rules.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 20
  },
  {
    code: '186',
    name: 'Employer Nomination Scheme visa',
    category: 'Employer sponsored',
    stream: 'permanent',
    summary:
      'Permanent employer-sponsored visa for skilled workers nominated by an Australian employer.',
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
    baseFeeAud: 4770,
    processingTime: '6-12 months',
    officialSearchHint: 'Home Affairs subclass 186 employer nomination scheme visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/employer-nomination-scheme-186',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 21
  },
  {
    code: '494',
    name: 'Skilled Employer Sponsored Regional (Provisional) visa',
    category: 'Employer sponsored',
    stream: 'regional',
    summary:
      'Provisional employer-sponsored visa for skilled workers in regional Australia, leading to PR via subclass 191.',
    bestFor: [
      'Regional employer sponsor available',
      'Willing to live and work regionally for 3+ years'
    ],
    coreRequirements: [
      'Regional employer nomination',
      'Skills assessment',
      'Under 45',
      'Competent English'
    ],
    documents: [
      'Passport',
      'Employer nomination',
      'Employment contract',
      'Skills assessment',
      'English evidence'
    ],
    baseFeeAud: 4770,
    processingTime: '4-12 months',
    officialSearchHint: 'Home Affairs subclass 494 skilled employer sponsored regional visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/skilled-employer-sponsored-regional-494',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 22
  },

  // ── Study & graduate ───────────────────────────────────
  {
    code: '500',
    name: 'Student visa',
    category: 'Study',
    stream: 'student',
    summary: 'Visa for studying an eligible course in Australia.',
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
    baseFeeAud: 1600,
    processingTime: '4-16 weeks',
    officialSearchHint: 'Home Affairs subclass 500 student visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes:
      'Student visa fees rose materially in 2024. Verify the current base application charge.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 30
  },
  {
    code: '485',
    name: 'Temporary Graduate visa',
    category: 'Graduate',
    stream: 'post-study',
    summary: 'Temporary visa for eligible recent graduates from Australian institutions.',
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
    baseFeeAud: 2235,
    processingTime: '4-12 months',
    officialSearchHint: 'Home Affairs subclass 485 temporary graduate visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-graduate-485',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 31
  },
  {
    code: '590',
    name: 'Student Guardian visa',
    category: 'Study',
    stream: 'guardian',
    summary: 'Visa for a parent or guardian to accompany a student under 18 in Australia.',
    bestFor: ['Parents or guardians of minor student visa holders'],
    coreRequirements: [
      'Eligible relationship to the student',
      'Financial capacity',
      'Health insurance'
    ],
    documents: [
      'Passport',
      'Relationship evidence',
      'Student visa grant for the child',
      'Financial evidence',
      'Health cover'
    ],
    baseFeeAud: 790,
    processingTime: '6-12 months',
    officialSearchHint: 'Home Affairs subclass 590 student guardian visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-guardian-590',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 32
  },

  // ── Partner & family ───────────────────────────────────
  {
    code: '820/801',
    name: 'Partner visa (Onshore)',
    category: 'Partner',
    stream: 'onshore',
    summary:
      'Two-stage partner visa for spouses or de facto partners of Australian citizens, permanent residents, or eligible NZ citizens applying inside Australia. 820 leads to permanent 801.',
    bestFor: [
      'Applicants in a genuine relationship with an eligible Australian partner inside Australia'
    ],
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
    baseFeeAud: 9365,
    processingTime: '20-32 months',
    officialSearchHint: 'Home Affairs partner visa subclass 820 801',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-onshore',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Single application fee covers both stages 820 + 801.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 40
  },
  {
    code: '309/100',
    name: 'Partner visa (Offshore)',
    category: 'Partner',
    stream: 'offshore',
    summary:
      'Two-stage partner visa for spouses or de facto partners applying outside Australia. 309 leads to permanent 100.',
    bestFor: [
      'Applicants in a genuine relationship with an eligible Australian partner outside Australia'
    ],
    coreRequirements: [
      'Eligible sponsor',
      'Genuine and continuing relationship',
      'Identity, health and character checks'
    ],
    documents: [
      'Passport',
      'Relationship statement',
      'Marriage/de facto evidence',
      'Joint finances/household evidence',
      'Police checks'
    ],
    baseFeeAud: 9365,
    processingTime: '20-29 months',
    officialSearchHint: 'Home Affairs partner visa subclass 309 100',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/partner-offshore',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Single application fee covers both stages 309 + 100.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 41
  },
  {
    code: '300',
    name: 'Prospective Marriage visa',
    category: 'Partner',
    stream: 'fiance',
    summary:
      'Visa for fiance(e)s of Australian citizens or permanent residents. Holder must marry within 9 months of arrival.',
    bestFor: ['Engaged couples planning to marry within 9 months of entry'],
    coreRequirements: [
      'Genuine intention to marry',
      'Eligible sponsor',
      'Identity, health and character checks'
    ],
    documents: [
      'Passport',
      'Notice of Intended Marriage',
      'Relationship evidence',
      'Police checks'
    ],
    baseFeeAud: 9365,
    processingTime: '17-23 months',
    officialSearchHint: 'Home Affairs subclass 300 prospective marriage visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/prospective-marriage-300',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 42
  },
  {
    code: '101',
    name: 'Child visa (Offshore)',
    category: 'Family',
    stream: 'offshore',
    summary:
      'Permanent visa for dependent children of Australian citizens, PR, or eligible NZ citizens applying outside Australia.',
    bestFor: ['Dependent children of Australian sponsors'],
    coreRequirements: [
      'Eligible sponsor parent',
      'Dependent child relationship',
      'Health and character checks'
    ],
    documents: [
      'Passport',
      'Birth certificate',
      'Sponsor PR/citizenship evidence',
      'Custody documents if applicable'
    ],
    baseFeeAud: 2790,
    processingTime: '12-16 months',
    officialSearchHint: 'Home Affairs subclass 101 child visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/child-101',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 43
  },

  // ── Visitor / working holiday ─────────────────────────
  {
    code: '600',
    name: 'Visitor visa',
    category: 'Visitor',
    stream: 'tourist',
    summary: 'Temporary visa for tourism, family visits, or short business visitor activities.',
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
    baseFeeAud: 200,
    processingTime: '2-6 weeks',
    officialSearchHint: 'Home Affairs subclass 600 visitor visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/visitor-600',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes:
      'Tourist stream base fee. Other streams (Sponsored Family, Business, Frequent Traveller) carry different fees.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 50
  },
  {
    code: '417',
    name: 'Working Holiday visa',
    category: 'Visitor',
    stream: 'working-holiday',
    summary:
      'Temporary visa for young adults from eligible countries to holiday and work in Australia for up to a year.',
    bestFor: ['18-30 (or 35) from eligible passport', 'First Australian working holiday'],
    coreRequirements: [
      'Eligible passport',
      'Age 18-30 (35 for some countries)',
      'Sufficient funds',
      'Health and character checks'
    ],
    documents: ['Passport', 'Funds evidence', 'Health/character declarations'],
    baseFeeAud: 650,
    processingTime: '1-30 days',
    officialSearchHint: 'Home Affairs subclass 417 working holiday visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-417',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 51
  },
  {
    code: '462',
    name: 'Work and Holiday visa',
    category: 'Visitor',
    stream: 'work-holiday',
    summary:
      'Equivalent of subclass 417 for young adults from a different list of eligible countries.',
    bestFor: ['18-30 from eligible passport not covered by 417', 'First Australian work and holiday'],
    coreRequirements: [
      'Eligible passport',
      'Age 18-30',
      'Tertiary qualification or some study (some countries)',
      'Functional English (some countries)',
      'Funds'
    ],
    documents: [
      'Passport',
      'Funds evidence',
      'Education evidence if required',
      'Government letter of support if required'
    ],
    baseFeeAud: 650,
    processingTime: '1-30 days',
    officialSearchHint: 'Home Affairs subclass 462 work and holiday visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/work-holiday-462',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 52
  },

  // ── Investor / business ───────────────────────────────
  {
    code: '188',
    name: 'Business Innovation and Investment (Provisional) visa',
    category: 'Business',
    stream: 'investor',
    summary:
      'Provisional visa for business owners, investors and entrepreneurs nominated by a state or territory.',
    bestFor: ['Established business owners or investors with state nomination'],
    coreRequirements: [
      'State or territory nomination',
      'Successful business or investment history',
      'Net assets thresholds',
      'Under 55 unless waived'
    ],
    documents: [
      'Passport',
      'Business records',
      'Financial statements',
      'State nomination',
      'Asset evidence'
    ],
    baseFeeAud: 10470,
    processingTime: '12-36 months',
    officialSearchHint: 'Home Affairs subclass 188 business innovation and investment visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/business-innovation-and-investment-188',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes:
      'BIIP program is being phased out / restructured. Verify whether the relevant stream is still open.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 60
  },
  {
    code: '888',
    name: 'Business Innovation and Investment (Permanent) visa',
    category: 'Business',
    stream: 'investor-pr',
    summary:
      'Permanent visa following subclass 188 for those who meet the business or investment requirements.',
    bestFor: ['Subclass 188 holders meeting their stream requirements'],
    coreRequirements: [
      'Hold a 188',
      'Meet stream-specific business/investment requirements',
      'State nomination if required'
    ],
    documents: [
      'Passport',
      'Business records',
      'Financial statements',
      'State nomination if required'
    ],
    baseFeeAud: 2825,
    processingTime: '12-24 months',
    officialSearchHint: 'Home Affairs subclass 888 business innovation and investment visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/business-innovation-and-investment-888',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 61
  },

  // ── Other notable ─────────────────────────────────────
  {
    code: '408',
    name: 'Temporary Activity visa',
    category: 'Other',
    stream: 'temporary-activity',
    summary:
      'Short-stay visa for specific activities such as religious work, sport, research, or entertainment.',
    bestFor: ['Sponsored religious workers', 'Athletes, entertainers, researchers'],
    coreRequirements: [
      'Sponsorship by an approved organisation',
      'Specific activity evidence',
      'Health/character checks'
    ],
    documents: ['Passport', 'Sponsor letter', 'Activity-specific evidence'],
    baseFeeAud: 415,
    processingTime: '1-3 months',
    officialSearchHint: 'Home Affairs subclass 408 temporary activity visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/temporary-activity-408',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes: 'Initial seed from AMA backend visa_data.py.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 70
  },
  {
    code: '870',
    name: 'Sponsored Parent (Temporary) visa',
    category: 'Family',
    stream: 'parent-temp',
    summary:
      'Long-stay temporary visa for parents of Australian sponsors. Up to 5 years per grant.',
    bestFor: [
      'Parents seeking long visits',
      'Families wanting parents in Australia without permanent migration'
    ],
    coreRequirements: [
      'Approved Australian sponsor',
      'Parent relationship evidence',
      'Health insurance for the full stay'
    ],
    documents: [
      'Passport',
      'Sponsor approval letter',
      'Relationship evidence',
      'Health insurance evidence'
    ],
    baseFeeAud: 1085,
    processingTime: 'Variable',
    officialSearchHint: 'Home Affairs subclass 870 sponsored parent visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/sponsored-parent-temporary-870',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes:
      'Sponsorship and visa charges differ between 3-year and 5-year stays. Verify current charges.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 71
  },
  {
    code: '143',
    name: 'Contributory Parent visa',
    category: 'Family',
    stream: 'parent-pr',
    summary:
      'Permanent visa for parents of Australian sponsors with a higher fee but shorter processing than the 103.',
    bestFor: ['Parents prepared to pay the contributory charge for faster processing'],
    coreRequirements: [
      'Eligible Australian child sponsor',
      'Balance of family test',
      'Assurance of Support',
      'Health and character checks'
    ],
    documents: [
      'Passport',
      'Family composition evidence',
      'Sponsor evidence',
      'Assurance of Support evidence'
    ],
    baseFeeAud: 47955,
    processingTime: '4-7 years',
    officialSearchHint: 'Home Affairs subclass 143 contributory parent visa',
    officialUrl:
      'https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/contributory-parent-143',
    legislationUrl: 'https://www.legislation.gov.au/F1996B03551/latest/text',
    source: 'seed',
    sourceNotes:
      'Total cost over both instalments is usually well over AUD 47,000 per applicant.',
    lastUpdatedAt: VISA_CATALOG_SEED_AT,
    displayOrder: 72
  }
];
