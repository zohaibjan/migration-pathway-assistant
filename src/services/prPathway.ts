// ============================================================
// PR Pathway Planner — deterministic, offline date math.
// ============================================================
// Helps a user understand the age-45 cutoff that applies to most
// skilled permanent-residence pathways, and (optionally) when they
// would meet the 2-year work requirement for the 482 -> 186 ENS
// Temporary Residence Transition (TRT) stream.
//
// This is general guidance only, not legal advice. Rules change and
// exemptions exist (e.g. high-income earners, certain occupations,
// long-term 457/482 holders). Every result is paired with a "verify
// on immi.homeaffairs.gov.au" caveat — see prPathway.ts consumers.
// ============================================================

export interface PrPathwayInput {
  birthDay: number; // 1-31
  birthMonth: number; // 1-12
  birthYear: number; // e.g. 1990
  on482Path: boolean; // working toward employer-sponsored 186 (ENS TRT)
  monthsWorkedForSponsor?: number; // full-time months already worked for the sponsor
}

export type PrPathwayStatus = 'ample' | 'tight' | 'critical' | 'past';

export interface TrtProjection {
  monthsRequired: number;
  monthsWorked: number;
  monthsRemaining: number;
  eligibleOn: string; // ISO date (yyyy-mm-dd)
  meetsBeforeCutoff: boolean;
}

export interface PrPathwayMilestone {
  label: string;
  date: string | null; // ISO date
  note?: string;
}

export interface PrPathwayResult {
  ageYears: number;
  turns45On: string; // ISO date
  daysUntil45: number;
  monthsUntil45: number;
  status: PrPathwayStatus;
  statusHeadline: string;
  statusDetail: string;
  trt: TrtProjection | null;
  milestones: PrPathwayMilestone[];
  warnings: string[];
  nextSteps: string[];
}

// The TRT stream of subclass 186 requires (since 25 Nov 2023) at least
// 2 years of full-time work for the nominating employer on a TSS/482.
const TRT_MONTHS_REQUIRED = 24;
const SKILLED_PR_CUTOFF_AGE = 45;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function isValidDob(day: number, month: number, year: number): boolean {
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const now = new Date();
  if (year < 1900 || year > now.getFullYear()) return false;
  const d = new Date(year, month - 1, day);
  // Reject overflow (e.g. 31 Feb rolls into March).
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function diffYears(from: Date, to: Date): number {
  let years = to.getFullYear() - from.getFullYear();
  const m = to.getMonth() - from.getMonth();
  if (m < 0 || (m === 0 && to.getDate() < from.getDate())) years--;
  return years;
}

/**
 * Compute the age-45 PR timeline (and optional 482 -> 186 TRT projection)
 * for the given inputs. `now` is injectable so the logic stays testable.
 */
export function computePrPathway(input: PrPathwayInput, now: Date = new Date()): PrPathwayResult {
  const dob = new Date(input.birthYear, input.birthMonth - 1, input.birthDay);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const ageYears = diffYears(dob, today);

  const cutoff = new Date(dob.getFullYear() + SKILLED_PR_CUTOFF_AGE, dob.getMonth(), dob.getDate());
  const daysUntil45 = Math.round((cutoff.getTime() - today.getTime()) / MS_PER_DAY);
  const monthsUntil45 = Math.max(0, Math.round(daysUntil45 / 30.4375));

  let status: PrPathwayStatus;
  let statusHeadline: string;
  let statusDetail: string;

  if (daysUntil45 <= 0) {
    status = 'past';
    statusHeadline = 'Past the age-45 skilled cut-off';
    statusDetail =
      'Most skilled and employer-sponsored permanent visas require you to be under 45 at the time of invitation or nomination. Some exemptions exist (for example certain high-income or specialist roles), so check the specific exemptions for your pathway.';
  } else if (daysUntil45 <= 365) {
    status = 'critical';
    statusHeadline = 'Under 1 year to the age-45 cut-off';
    statusDetail =
      'You are close to the age-45 limit for most skilled PR pathways. If a skilled or employer-sponsored visa is your goal, prioritise the steps that gate your application now.';
  } else if (daysUntil45 <= 365 * 3) {
    status = 'tight';
    statusHeadline = 'Around 1-3 years to the age-45 cut-off';
    statusDetail =
      'There is a workable window, but skills assessments, English tests, and sponsorship can each take months. Map your milestones against the cut-off date below.';
  } else {
    status = 'ample';
    statusHeadline = 'Several years to the age-45 cut-off';
    statusDetail =
      'You have time before the age-45 limit affects most skilled pathways. Use it to strengthen points (English, experience, qualifications) and decide on a primary pathway.';
  }

  const warnings: string[] = [];
  const nextSteps: string[] = [];
  const milestones: PrPathwayMilestone[] = [
    { label: 'Today', date: toISODate(today) },
    {
      label: `You turn ${SKILLED_PR_CUTOFF_AGE}`,
      date: toISODate(cutoff),
      note: 'Hard limit for most skilled / employer-sponsored PR (subject to exemptions).'
    }
  ];

  // ── Optional 482 -> 186 TRT projection ──────────────────────
  let trt: TrtProjection | null = null;
  if (input.on482Path) {
    const monthsWorked = Math.max(0, Math.floor(input.monthsWorkedForSponsor ?? 0));
    const monthsRemaining = Math.max(0, TRT_MONTHS_REQUIRED - monthsWorked);
    const eligibleDate = addMonths(today, monthsRemaining);
    const meetsBeforeCutoff = eligibleDate.getTime() < cutoff.getTime();

    trt = {
      monthsRequired: TRT_MONTHS_REQUIRED,
      monthsWorked,
      monthsRemaining,
      eligibleOn: toISODate(eligibleDate),
      meetsBeforeCutoff
    };

    milestones.push({
      label: '186 ENS (TRT) work requirement met',
      date: toISODate(eligibleDate),
      note:
        monthsRemaining === 0
          ? 'You appear to already meet the 2-year full-time work requirement.'
          : `Projected after ${monthsRemaining} more month${monthsRemaining === 1 ? '' : 's'} of full-time work with your sponsor.`
    });

    if (!meetsBeforeCutoff && status !== 'past') {
      warnings.push(
        'On current numbers, you would meet the 2-year 186 (TRT) work requirement after you turn 45. You may need to apply before the requirement is met under a different stream, rely on an age exemption, or consider the Direct Entry stream — confirm with a registered migration agent.'
      );
    }
    nextSteps.push(
      'Confirm your exact 482/TSS start date and full-time months with your employer — the 2-year clock must be with the nominating employer.'
    );
    nextSteps.push(
      'Ask your employer to confirm they will lodge a 186 (TRT) nomination when you become eligible.'
    );
  }

  if (status === 'past') {
    nextSteps.push(
      'Check age-exemption categories (e.g. certain high-income earners, specialist occupations, or eligible long-term 457/482 holders) for your specific pathway.'
    );
    nextSteps.push('Speak with a MARA-registered migration agent about pathways that are not age-capped.');
  } else {
    nextSteps.push('Complete a skills assessment for your occupation if your pathway requires one.');
    nextSteps.push('Sit an English test (IELTS/PTE) early — scores drive both eligibility and points.');
  }

  warnings.push(
    'Age is assessed at the time of invitation or nomination, not when you start. Build in buffer time for processing.'
  );

  return {
    ageYears,
    turns45On: toISODate(cutoff),
    daysUntil45,
    monthsUntil45,
    status,
    statusHeadline,
    statusDetail,
    trt,
    milestones,
    warnings,
    nextSteps
  };
}
