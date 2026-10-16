import { VISA_OPTIONS } from '../data/visaOptions';
import type {
  AssessmentAnswers,
  AssessmentResult,
  EligibilityStatus,
  VisaCode,
  VisaRecommendation
} from '../types';

export const defaultAnswers: AssessmentAnswers = {
  goal: 'unsure',
  ageRange: '25_32',
  nationality: '',
  location: 'outside_au',
  currentVisa: '',
  occupation: '',
  hasSkillsAssessment: false,
  englishLevel: 'unknown',
  yearsExperience: 'none',
  qualification: 'none',
  hasEmployerSponsor: false,
  hasStateNomination: false,
  regionalWilling: false,
  hasAustralianPartner: false,
  wantsToStudy: false,
  fundsAvailable: false,
  healthCharacterConcern: false
};

// ── Helpers ──────────────────────────────────────────────────────────────────

const ageEligibleForSkilled = (a: AssessmentAnswers) => a.ageRange !== '45_plus';

const hasSuperiorEnglish = (a: AssessmentAnswers) => a.englishLevel === 'superior';
const hasProficientEnglish = (a: AssessmentAnswers) => a.englishLevel === 'proficient';
const hasStrongEnglish = (a: AssessmentAnswers) => hasSuperiorEnglish(a) || hasProficientEnglish(a);
const hasCompetentEnglish = (a: AssessmentAnswers) =>
  a.englishLevel === 'competent' || hasStrongEnglish(a);

const hasExperience = (a: AssessmentAnswers) =>
  a.yearsExperience === '3_5' || a.yearsExperience === '5_8' || a.yearsExperience === '8_plus';

const hasQualification = (a: AssessmentAnswers) =>
  a.qualification === 'diploma' || a.qualification === 'bachelor' || a.qualification === 'masters_phd';

// Estimates raw immigration points for the standard points test (used for guidance messaging).
function estimateImmigrationPoints(a: AssessmentAnswers): number {
  let pts = 0;

  // Age (max 30 pts at 25-32)
  if (a.ageRange === '25_32') pts += 30;
  else if (a.ageRange === '33_39') pts += 25;
  else if (a.ageRange === '18_24') pts += 25;
  else if (a.ageRange === '40_44') pts += 15;

  // English (max 20 pts)
  if (hasSuperiorEnglish(a)) pts += 20;
  else if (hasProficientEnglish(a)) pts += 10;

  // Qualification (max 20 pts for PhD)
  if (a.qualification === 'masters_phd') pts += 20;
  else if (a.qualification === 'bachelor') pts += 15;
  else if (a.qualification === 'diploma') pts += 10;
  else if (a.qualification === 'certificate') pts += 10;

  // Overseas skilled work experience (max 15 pts)
  if (a.yearsExperience === '8_plus') pts += 15;
  else if (a.yearsExperience === '5_8') pts += 10;
  else if (a.yearsExperience === '3_5') pts += 5;

  // Partner skills (not captured in this form, so 0)
  // Australian study (not captured, 0)
  // Community language (not captured, 0)
  // Regional study (not captured, 0)

  return pts;
}

function statusFromScore(score: number, criticalWarnings: string[]): EligibilityStatus {
  if (criticalWarnings.length > 0 && score < 60) return 'not_likely';
  if (score >= 78) return 'likely_eligible';
  if (score >= 50) return 'possible';
  if (score >= 35) return 'needs_review';
  return 'not_likely';
}

function buildRecommendation(code: VisaCode, answers: AssessmentAnswers): VisaRecommendation {
  const visa = VISA_OPTIONS.find(v => v.code === code);
  if (!visa) throw new Error(`Unknown visa code ${code}`);

  let score = 20;
  const reasons: string[] = [];
  const gaps: string[] = [];
  const criticalWarnings: string[] = [];
  const nextSteps: string[] = [];

  const add = (points: number, reason: string) => { score += points; reasons.push(reason); };
  const gap = (message: string) => gaps.push(message);
  const critical = (message: string) => criticalWarnings.push(message);

  if (answers.healthCharacterConcern) {
    critical('Health or character concerns can significantly affect all visa pathways. Seek professional advice before lodging any application.');
  }

  // ── English gap warning (applies to all skilled/employer paths) ───────────
  const englishGapWarning = () => {
    gap('An approved English test result is required for migration — IELTS, PTE Academic, TOEFL iBT, or OET. University or college English certificates are not accepted by the Department of Home Affairs.');
  };

  switch (code) {
    case '189': {
      if (answers.goal === 'work' || answers.goal === 'settle' || answers.goal === 'unsure')
        add(10, 'Your goal aligns with a permanent skilled independent pathway.');

      if (ageEligibleForSkilled(answers)) {
        if (answers.ageRange === '25_32')
          add(18, 'Age 25–32 earns the maximum 30 immigration points in the points test — a significant competitive advantage.');
        else if (answers.ageRange === '18_24' || answers.ageRange === '33_39')
          add(14, 'Your age group earns 25 immigration points in the points test.');
        else
          add(10, 'Age 40–44 earns 15 immigration points; still eligible but competition is tight.');
      } else {
        critical('Skilled visas generally require applicants to be under 45 at the time of invitation.');
      }

      if (answers.occupation.trim())
        add(10, 'Your occupation can be checked against the Medium and Long-term Strategic Skills List (MLTSSL). If it appears, you are eligible to lodge an EOI for the 189.');
      else
        gap('Enter your occupation so it can be matched against the MLTSSL at homeaffairs.gov.au.');

      if (answers.hasSkillsAssessment)
        add(20, 'A positive skills assessment is the cornerstone of the 189 pathway — you already have this key prerequisite.');
      else
        gap('A positive skills assessment from your nominated assessing body (e.g. VETASSESS for many professions, Engineers Australia, ACS for IT, AHPRA for health) is required before you can lodge an EOI in SkillSelect.');

      if (hasSuperiorEnglish(answers))
        add(16, 'Superior English (IELTS 8+ overall) earns 20 immigration points — the maximum English bonus in the points test.');
      else if (hasProficientEnglish(answers))
        add(12, 'Proficient English (IELTS 7+ overall) earns 10 immigration points in the points test.');
      else if (hasCompetentEnglish(answers))
        add(8, 'Competent English (IELTS 6+) meets the minimum skilled visa requirement but earns no additional points.');
      else
        englishGapWarning();

      if (answers.yearsExperience === '8_plus')
        add(12, '8+ years of overseas skilled experience earns 15 immigration points.');
      else if (answers.yearsExperience === '5_8')
        add(10, '5–8 years overseas skilled experience earns 10 immigration points.');
      else if (hasExperience(answers))
        add(7, 'Your work experience contributes to the immigration points test.');
      else
        gap('Relevant overseas skilled work experience earns immigration points and strengthens your skills assessment claim.');

      if (answers.qualification === 'masters_phd')
        add(12, 'A PhD or Masters qualification earns 20 immigration points — a strong boost to your score.');
      else if (hasQualification(answers))
        add(8, 'Your qualification contributes to the immigration points test and may support your skills assessment.');
      else
        gap('A recognised qualification in your field contributes to both the points test and your skills assessment.');

      const pts = estimateImmigrationPoints(answers);
      nextSteps.push(
        `Estimated immigration points based on your inputs: ~${pts} pts. The 189 typically requires 65–85+ pts for invitation; check SkillSelect for current cut-off trends.`,
        'Confirm your occupation on the MLTSSL: homeaffairs.gov.au/working-in-au/skillselect/eligible-skilled-occupations.',
        'Identify the skills assessing body for your occupation from the MLTSSL (e.g. VETASSESS, Engineers Australia, ACS, AHPRA) and begin their process.',
        'Sit an English test if not already done — IELTS or PTE Academic are most common. PTE Academic is often fastest to book and receive results.',
        'Once you have a skills assessment, lodge an Expression of Interest (EOI) in SkillSelect at immi.homeaffairs.gov.au.',
        answers.ageRange === '25_32' || answers.ageRange === '33_39'
          ? 'If points look borderline, consider 190 (state nomination, +5 pts) or 491 (regional, +15 pts) for a higher invitation chance.'
          : 'If 189 points are tight, consider 190 (state nomination) or 491 (regional) as they have separate invitation pools.'
      );
      break;
    }

    case '190': {
      if (answers.goal === 'work' || answers.goal === 'settle' || answers.goal === 'unsure')
        add(10, 'Your goal aligns with a skilled nominated permanent pathway.');

      if (ageEligibleForSkilled(answers)) {
        if (answers.ageRange === '25_32')
          add(12, 'Age 25–32 earns the maximum 30 immigration points — an excellent foundation for a state-nominated visa.');
        else
          add(10, 'Your age group earns immigration points toward the points test for the 190.');
      } else {
        critical('Skilled visas generally require applicants to be under 45 at the time of invitation.');
      }

      if (answers.hasStateNomination)
        add(22, 'State or territory nomination adds 5 immigration points and is the core requirement for the 190 pathway.');
      else
        gap('State or territory nomination is required for the 190. Each state publishes occupation lists and nomination criteria at their immigration website.');

      if (answers.hasSkillsAssessment)
        add(16, 'A positive skills assessment is required for the 190 and you already have one.');
      else
        gap('A positive skills assessment from the relevant assessing body is required before applying for state nomination or lodging your EOI.');

      if (hasSuperiorEnglish(answers))
        add(12, 'Superior English earns 20 immigration points — the maximum English bonus.');
      else if (hasProficientEnglish(answers))
        add(10, 'Proficient English earns 10 immigration points toward the points test.');
      else if (hasCompetentEnglish(answers))
        add(8, 'Competent English meets the minimum requirement for most skilled visas.');
      else
        englishGapWarning();

      if (answers.occupation.trim())
        add(8, 'Your occupation can be matched to state occupation lists — many states target specific occupations for 190 nomination.');
      else
        gap('Add your occupation before checking state nomination criteria, as states nominate specific occupations only.');

      if (answers.qualification === 'masters_phd')
        add(8, 'PhD or Masters earns 20 immigration points and strengthens your nomination application.');
      else if (hasQualification(answers))
        add(5, 'Your qualification contributes to your points total and nomination application.');

      const pts = estimateImmigrationPoints(answers);
      nextSteps.push(
        `Estimated immigration points: ~${pts} pts + 5 pts from state nomination = ~${pts + 5} pts total. The 190 has lower competition than 189 in most occupations.`,
        'Check each state and territory\'s immigration website for their current occupation lists and nomination requirements.',
        'Obtain your skills assessment first — most states require this before assessing your nomination application.',
        'Compare 190 and 491 — if regional living is acceptable, 491 adds 15 pts instead of 5, significantly improving invite chances.',
        'Commit to living in the nominating state for at least 2 years (required condition of nomination).'
      );
      break;
    }

    case '491': {
      if (answers.regionalWilling)
        add(24, 'Willingness to live and work in regional Australia is the foundational requirement — and earns 15 extra immigration points over the 189 invitation pool.');
      else
        gap('You need to be willing and able to live and work in regional Australia. The 491 is a provisional visa with a 5-year regional residence obligation before PR eligibility.');

      if (ageEligibleForSkilled(answers)) {
        if (answers.ageRange === '25_32')
          add(12, 'Age 25–32 earns the maximum 30 immigration points — combined with 491 regional points, this is highly competitive.');
        else
          add(10, 'Your age earns immigration points toward the 491 points test.');
      } else {
        critical('Skilled regional visas generally require applicants to be under 45 at the time of invitation.');
      }

      if (answers.hasSkillsAssessment)
        add(15, 'A positive skills assessment is a core requirement for the 491 and you already have one.');
      else
        gap('A positive skills assessment from the relevant assessing body is required before lodging an EOI for the 491.');

      if (answers.hasStateNomination)
        add(12, 'Regional state or territory nomination supports the 491 pathway and adds significant points.');
      else
        gap('Regional state/territory nomination or eligible family sponsorship (from a relative living in a designated regional area) is required for the 491.');

      if (hasSuperiorEnglish(answers))
        add(10, 'Superior English earns 20 immigration points, boosting your 491 invitation prospects.');
      else if (hasCompetentEnglish(answers))
        add(8, 'Your English level meets or exceeds the minimum requirement for the 491.');
      else
        englishGapWarning();

      if (answers.occupation.trim())
        add(6, 'Your occupation can be checked against MLTSSL and STSOL lists. Regional states often nominate a broader range of occupations than metro states.');

      if (answers.qualification === 'masters_phd')
        add(8, 'PhD or Masters qualification earns 20 immigration points and may open additional regional university pathways.');
      else if (hasQualification(answers))
        add(5, 'Your qualification contributes to the immigration points test.');

      const pts = estimateImmigrationPoints(answers);
      nextSteps.push(
        `Estimated immigration points: ~${pts} pts + 15 pts (491 regional) = ~${pts + 15} pts. The 491 has a separate, lower invitation threshold than the 189/190.`,
        'Confirm your occupation on the MLTSSL or STSOL list — regional states often accept occupations not available under 189/190.',
        'Research which regional states or territories have your occupation on their 491 nomination list.',
        'Understand the 5-year regional residence obligation and the pathway to permanent residence via subclass 191 after 3 years.',
        'Consider regional universities and employers in agricultural, health, and engineering sectors who may offer employer sponsorship or nomination support.'
      );
      break;
    }

    case '482': {
      if (answers.hasEmployerSponsor)
        add(35, 'An approved employer sponsor is the critical requirement for the TSS visa — this significantly opens the pathway.');
      else
        critical('This visa requires an approved Australian employer to sponsor you. Without a sponsoring employer, this pathway is not available.');

      if (answers.occupation.trim())
        add(12, 'Your nominated occupation can be assessed against the Short-term or Medium and Long-term Skills List applicable to your stream.');
      else
        gap('Add the occupation title of the sponsored role — the salary, duties, and occupation code must align with the employer\'s nomination.');

      if (hasExperience(answers))
        add(15, 'Your work experience demonstrates capability in the sponsored role, which the employer must evidence.');
      else
        gap('At least 2 years of relevant work experience in the nominated role is generally required for the 482 visa.');

      if (hasSuperiorEnglish(answers) || hasProficientEnglish(answers))
        add(8, 'Your English level likely meets TSS visa requirements — exact threshold depends on occupation and stream.');
      else if (hasCompetentEnglish(answers))
        add(6, 'Competent English may meet TSS requirements depending on the stream and passport country.');
      else
        englishGapWarning();

      nextSteps.push(
        'Confirm with your employer whether they are an approved Standard Business Sponsor (SBS) or are willing to apply for approval.',
        'Verify the nominated occupation is on the eligible occupation list for the appropriate stream (STSOL for Short-term Stream, MLTSSL for Medium-term Stream).',
        'Ensure the salary meets the Temporary Skilled Migration Income Threshold (TSMIT) — currently AUD 73,150 per year (check current figure).',
        'Collect employment references, qualifications, and role evidence for the nomination application.',
        'After 2–3 years on a 482 Medium-term Stream, you may be eligible to apply for the subclass 186 ENS permanent visa.'
      );
      break;
    }

    case '186': {
      if (answers.hasEmployerSponsor)
        add(30, 'Long-term employer support is the foundation of the ENS permanent pathway.');
      else
        critical('Employer nomination is required for the subclass 186. A sponsoring employer must nominate you for a position.');

      if (ageEligibleForSkilled(answers))
        add(10, 'Your age is within the usual ENS range — though some streams have age exemptions worth checking.');
      else
        gap('Age exemptions are limited under some ENS streams. Professional advice is recommended if you are 45 or older.');

      if (hasExperience(answers))
        add(14, 'Strong work experience demonstrates your capacity for the nominated role, which is central to the nomination.');
      else
        gap('Substantial work experience in the nominated occupation is required for employer nomination — typically 3+ years.');

      if (hasSuperiorEnglish(answers) || hasProficientEnglish(answers))
        add(10, 'Your English level likely meets permanent employer-sponsored visa criteria.');
      else if (hasCompetentEnglish(answers))
        add(7, 'Competent English generally meets ENS criteria, but check the specific stream requirements.');
      else
        englishGapWarning();

      if (answers.hasSkillsAssessment)
        add(8, 'A skills assessment may be required for the Direct Entry stream and you already have one.');
      else
        gap('Depending on the ENS stream (Temporary Residence Transition or Direct Entry), a skills assessment may be required. Confirm with your employer.');

      nextSteps.push(
        'Identify the ENS stream: Temporary Residence Transition (TRT) requires 3 years on a 482 in the same role; Direct Entry requires skills assessment.',
        'Confirm nomination criteria with your employer — salary, duties, occupation code, and any state/territory obligations.',
        'Age 45+ applicants should seek professional advice on available exemptions.',
        'Collect employment evidence: contracts, payslips, references, and position descriptions.'
      );
      break;
    }

    case '500': {
      if (answers.goal === 'study' || answers.wantsToStudy)
        add(35, 'Studying in Australia is your stated goal — the subclass 500 is the primary pathway for this.');

      if (answers.fundsAvailable)
        add(18, 'Demonstrating financial capacity is a key requirement for the student visa and you have indicated funds are available.');
      else
        gap('Financial capacity evidence is essential — tuition fees, living costs (~AUD 20,000/yr), and health cover (OSHC) must be shown.');

      if (answers.qualification !== 'none')
        add(8, 'Your prior study history supports course progression consistency, which Home Affairs assesses under the Genuine Student requirement.');

      if (answers.englishLevel !== 'unknown')
        add(8, 'English evidence can support both course admission and visa English requirements.');
      else
        gap('Most Australian universities and VET providers require IELTS 6.0–6.5 (or PTE equivalent). Check your course\'s specific English requirement.');

      nextSteps.push(
        'Choose a registered provider (CRICOS-registered) and apply for an offer letter. Confirm the course is at a level consistent with your study history.',
        'Prepare a Genuine Student statement explaining why you are studying in Australia and your post-study plans.',
        'Obtain Overseas Student Health Cover (OSHC) — this is compulsory and must be in place before your visa is granted.',
        'Gather financial evidence: bank statements, scholarship letter, or sponsor declaration showing sufficient funds.',
        'Student visa holders typically have limited work rights (up to 48 hours per fortnight during study; unlimited during scheduled breaks).'
      );
      break;
    }

    case '485': {
      if (answers.location === 'inside_au')
        add(12, 'This pathway is relevant for applicants currently in Australia following study.');

      if (answers.wantsToStudy || answers.currentVisa.toLowerCase().includes('student'))
        add(20, 'Your study background or current student visa may align with the Temporary Graduate pathway.');

      if (answers.qualification === 'bachelor' || answers.qualification === 'masters_phd')
        add(18, 'Your qualification level may support graduate work rights if the degree was completed at an Australian institution.');
      else
        gap('An Australian qualification (from a CRICOS-registered provider) is required for the 485. Overseas degrees do not qualify.');

      if (hasCompetentEnglish(answers))
        add(10, 'English evidence meeting the minimum threshold may satisfy the 485 requirements.');
      else
        gap('An English test result (IELTS, PTE, TOEFL, or OET) is required for the 485 — no university exemptions apply.');

      nextSteps.push(
        'Confirm your degree was completed at a CRICOS-registered Australian provider — it must be at least AQF Level 7 (Bachelor) for the Graduate Work stream.',
        'Apply within 6 months of receiving your final results — the 485 deadline is strict.',
        'Organise a Federal Police (AFP) check and health examination early as processing times vary.',
        'Use the 485 period to gain skilled Australian work experience, which may contribute to future skilled visa or state nomination applications.'
      );
      break;
    }

    case '820/801': {
      if (answers.hasAustralianPartner)
        add(45, 'An eligible Australian partner or spouse is the central requirement — and you have indicated this applies.');
      else
        critical('This visa requires a genuine relationship with an Australian citizen, permanent resident, or eligible NZ citizen. Without an eligible partner, this pathway is not available.');

      if (answers.location === 'inside_au')
        add(8, 'Being onshore in Australia may align with the subclass 820 (onshore partner visa pathway).');

      gap('Relationship evidence must be comprehensive and cover four categories: financial, household, social, and commitment to each other.');
      nextSteps.push(
        'Compile relationship evidence across all four categories: joint finances, shared household, social recognition (family, friends, community), and commitment (communication, shared plans).',
        'Confirm your sponsor\'s eligibility — they must not have previously sponsored another partner, or must meet waiting period requirements.',
        'Note: the partner visa has two stages — a temporary stage (820 or 309) granted first, then permanent (801 or 100) after 2 years. Processing for the permanent stage is very slow (4–5+ years).',
        'Seek advice from a registered migration agent if there are any previous refusals, criminal history, or complex relationship circumstances.'
      );
      break;
    }

    case '600': {
      if (answers.goal === 'visit' || answers.goal === 'unsure')
        add(25, 'A temporary visit aligns with the Tourist stream of the subclass 600.');

      if (answers.fundsAvailable)
        add(18, 'Financial capacity evidence (bank statements) is available to demonstrate you can fund your visit.');
      else
        gap('Bank statements or sponsor support evidence showing sufficient funds for your stay are usually required.');

      if (!answers.healthCharacterConcern)
        add(8, 'No health or character concerns were flagged, which is important for visitor visa approval.');

      nextSteps.push(
        'Prepare evidence of genuine temporary stay: return tickets, accommodation bookings, evidence of ties to home country (employment, property, family).',
        'Note: the visitor visa is not a pathway to work or migration. If your intent is to work or stay permanently, a different visa is required.',
        'Pakistani, Indian, and many other passport holders should check whether they need to apply online through ImmiAccount or via paper.'
      );
      break;
    }

    case '858': {
      if (answers.qualification === 'masters_phd')
        add(30, 'A PhD or Masters qualification is common among successful Global Talent applicants and demonstrates deep expertise.');
      else if (answers.qualification === 'bachelor')
        add(12, 'A bachelor degree may support a Global Talent case, particularly in fast-moving technical sectors.');
      else
        gap('A strong qualification in your target sector typically underpins a credible Global Talent endorsement application.');

      if (answers.occupation.trim())
        add(15, 'Your sector can be checked against the eight Global Talent target sectors. Agricultural scientists, researchers, and technologists often qualify under Agri-food and AgTech or Education Research.');

      if (hasSuperiorEnglish(answers) || hasProficientEnglish(answers))
        add(10, 'Strong English supports your nomination materials and endorsement application.');

      if (hasExperience(answers))
        add(12, 'Active contribution to your field through research, projects, or leadership roles is a key factor assessors look for.');

      if (answers.ageRange === '25_32' || answers.ageRange === '33_39')
        add(8, 'Your career stage — productive but with strong future trajectory — is compelling to endorsing organisations.');

      gap('An endorsement letter from an eligible nominating organisation is required: a university, ARC, NHMRC, or recognised peak industry body must formally endorse you.');
      gap('Evidence of international standing is essential: peer-reviewed publications (especially Q1/Q2 journals), citation counts, invited international talks, competitive grants, or patents.');

      nextSteps.push(
        'Check the eight Global Talent target sectors: Agri-food and AgTech, Energy, Health Industries, Defence and Advanced Manufacturing, Quantum/AI Computing, Fintech, Space Technology, Education Research.',
        'Identify an eligible nominating organisation — for agricultural researchers, this is typically a university research centre, ARC, or major agri-industry body.',
        'Prepare an impact statement showing international recognition: publication metrics (H-index, citations), journal rankings, invited keynote talks, competitive grant amounts, media coverage.',
        'Note: the Global Talent visa has NO minimum points score and can process in weeks to months when evidence is strong.',
        'Engage a migration agent who specialises in Global Talent — the endorsement strategy and evidence framing are critical to success.',
        'Run a parallel check on the standard skilled stream (189/190) — if your occupation is on the MLTSSL, it provides a strong backup pathway.'
      );
      break;
    }
  }

  score = Math.max(0, Math.min(100, score));
  const status = statusFromScore(score, criticalWarnings);
  const confidence = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low';

  return { visa, status, score, confidence, reasons, gaps, criticalWarnings, nextSteps };
}

function makeTitle(answers: AssessmentAnswers): string {
  const goalLabels: Record<AssessmentAnswers['goal'], string> = {
    work: 'Work pathway',
    study: 'Study pathway',
    partner: 'Partner pathway',
    visit: 'Visit pathway',
    settle: 'Settlement pathway',
    unsure: 'Visa options'
  };
  const goal = goalLabels[answers.goal];
  const occupation = answers.occupation.trim();
  return occupation ? `${goal} — ${occupation}` : goal;
}

export function runAssessment(answers: AssessmentAnswers): AssessmentResult {
  const recommendations = VISA_OPTIONS
    .map(option => buildRecommendation(option.code, answers))
    .sort((a, b) => b.score - a.score);

  const documentChecklist = Array.from(new Set(
    recommendations.slice(0, 3).flatMap(rec => rec.visa.documents)
  ));

  const generalWarnings = [
    'Visa rules, occupation lists, and invitation thresholds change frequently. Always verify against the official Home Affairs website (homeaffairs.gov.au) before acting.',
    'This tool provides general guidance only — it is not legal advice and does not replace advice from a registered migration agent (MARA) or immigration lawyer.'
  ];

  if (answers.healthCharacterConcern) {
    generalWarnings.unshift('Health or character concerns can significantly affect eligibility across all pathways. Seek professional advice from a registered migration agent before lodging any application.');
  }

  if (answers.englishLevel === 'unknown' || answers.englishLevel === 'functional') {
    generalWarnings.push('Important: Australian migration requires an approved English test (IELTS, PTE Academic, TOEFL iBT, or OET). University-issued English certificates are not accepted. Book your test early as results are valid for 3 years.');
  }

  return {
    id: Date.now().toString(36),
    createdAt: new Date().toISOString(),
    title: makeTitle(answers),
    answers,
    recommendations,
    generalWarnings,
    documentChecklist
  };
}
