// Template service catalogue mentors pick from (BUG-043). Grouped by category; each entry has a
// prefilled title + description + suggested duration the mentor can edit. Placeholder set for now;
// the finalised list comes from Vinoth later (moving this to a DB table + admin CRUD is the follow-up).
// Categories MUST be values from SERVICE_CATEGORIES (lib/content).

export interface CatalogService {
  code: string;          // stable id, links a mentor's service back to its template
  category: string;      // one of SERVICE_CATEGORIES
  title: string;
  description: string;   // prefilled rich-text (HTML) the mentor can edit
  duration: number;      // suggested default duration (minutes)
  free?: boolean;        // e.g. a free intro call -> price 0 regardless of the base rate
}

const D = (intro: string, bullets: string[], outcome: string) =>
  `<p>${intro}</p><ul>${bullets.map((b) => `<li>${b}</li>`).join('')}</ul><p><strong>You'll leave with:</strong> ${outcome}</p>`;

export const SERVICE_CATALOG: CatalogService[] = [
  // ── General Guidance ──
  { code: 'gen-intro', category: 'General Guidance', title: 'Introductory call', duration: 15, free: true,
    description: D('A short, no-pressure call to see if we\'re a good fit and how I can help.',
      ['Your goal and current situation', 'How I can support you', 'What working together looks like'],
      'a clear sense of whether to book a full session.') },
  { code: 'gen-qa', category: 'General Guidance', title: 'General Q&A session', duration: 30,
    description: D('Bring your questions about moving, studying or working abroad and I\'ll answer from lived experience.',
      ['Your specific questions', 'Practical, experience-based answers', 'Pointers and resources'],
      'concrete answers and next steps.') },

  // ── Jobs & Careers ──
  { code: 'job-cv', category: 'Jobs & Careers', title: 'CV / Resume review', duration: 30,
    description: D('A focused review of your CV, tailored to the local job market.',
      ['Structure, wording and formatting', 'Local expectations and keywords', 'Concrete edits to make'],
      'a stronger, market-ready CV.') },
  { code: 'job-interview', category: 'Jobs & Careers', title: 'Mock interview', duration: 45,
    description: D('A realistic practice interview with direct, actionable feedback.',
      ['Common questions for your role', 'Your delivery and answers', 'What to improve'],
      'more confidence and a plan to prepare.') },
  { code: 'job-strategy', category: 'Jobs & Careers', title: 'Job search strategy', duration: 45,
    description: D('Build a practical plan to find and land roles in your target country.',
      ['Where and how to apply', 'Networking and referrals', 'Timelines and targets'],
      'a step-by-step job-search plan.') },
  { code: 'job-linkedin', category: 'Jobs & Careers', title: 'LinkedIn profile review', duration: 30,
    description: D('Make your LinkedIn profile work for recruiters in your target market.',
      ['Headline, summary and experience', 'Keywords recruiters search for', 'Visibility tips'],
      'a recruiter-ready profile.') },

  // ── Visa & Immigration ──
  { code: 'visa-options', category: 'Visa & Immigration', title: 'Visa options consultation', duration: 30,
    description: D('Understand which visa routes realistically fit your situation.',
      ['Your eligibility at a glance', 'Routes worth pursuing', 'Common pitfalls to avoid'],
      'clarity on the right visa path.') },
  { code: 'visa-review', category: 'Visa & Immigration', title: 'Visa application review', duration: 45,
    description: D('A careful walk-through of your application and documents before you submit.',
      ['Documents and requirements', 'Gaps or red flags', 'How to strengthen it'],
      'a submission-ready application.') },
  { code: 'visa-pr', category: 'Visa & Immigration', title: 'PR / residency pathway', duration: 45,
    description: D('Map your route from your current status to permanent residency.',
      ['Requirements and timelines', 'What to start doing now', 'Milestones to track'],
      'a long-term residency plan.') },

  // ── Education & Studies ──
  { code: 'study-uni', category: 'Education & Studies', title: 'University application guidance', duration: 45,
    description: D('Guidance on applying to universities abroad, from shortlist to submission.',
      ['Choosing programs and universities', 'Application and documents', 'Deadlines and strategy'],
      'a clear application plan.') },
  { code: 'study-course', category: 'Education & Studies', title: 'Course / program selection', duration: 30,
    description: D('Pick the program that fits your goals, budget and profile.',
      ['Your goals and options', 'Fit, cost and outcomes', 'A shortlist to pursue'],
      'a focused shortlist of programs.') },

  // ── Housing & Relocation ──
  { code: 'house-relocation', category: 'Housing & Relocation', title: 'Relocation planning', duration: 45,
    description: D('Plan your move end to end so nothing catches you off guard.',
      ['Timeline and checklist', 'What to arrange before and after arrival', 'Costs to budget for'],
      'a practical relocation checklist.') },
  { code: 'house-housing', category: 'Housing & Relocation', title: 'Housing & neighbourhood guidance', duration: 30,
    description: D('Find the right place to live and avoid common rental traps.',
      ['Where to search and how', 'Neighbourhoods to consider', 'Scams and contracts to watch'],
      'a smarter housing search.') },

  // ── Finance & Taxes ──
  { code: 'fin-setup', category: 'Finance & Taxes', title: 'Banking & taxes setup', duration: 30,
    description: D('Get your banking, taxes and essentials sorted as a newcomer.',
      ['Opening accounts and essentials', 'Tax basics for your situation', 'What to set up first'],
      'a clear financial setup checklist.') },
  { code: 'fin-col', category: 'Finance & Taxes', title: 'Cost-of-living planning', duration: 30,
    description: D('Understand what life really costs so you can budget with confidence.',
      ['Typical monthly costs', 'Where to save', 'Budgeting for the first months'],
      'a realistic budget.') },

  // ── Culture & Daily Life ──
  { code: 'life-settle', category: 'Culture & Daily Life', title: 'Settling-in & culture call', duration: 30,
    description: D('Get grounded quickly with insider tips on daily life and culture.',
      ['Everyday admin and routines', 'Cultural do\'s and don\'ts', 'How to build a network'],
      'a smoother first few months.') },

  // ── Business & Startup ──
  { code: 'biz-startup', category: 'Business & Startup', title: 'Startup / business setup', duration: 45,
    description: D('Guidance on starting or registering a business in your target country.',
      ['Structure and registration', 'Key requirements', 'First steps to take'],
      'a plan to get set up.') },
  { code: 'biz-freelance', category: 'Business & Startup', title: 'Freelancing abroad', duration: 30,
    description: D('Set yourself up to freelance or contract legally and sustainably.',
      ['Status, permits and taxes', 'Finding clients', 'Rates and admin'],
      'a freelancing starter plan.') },
];

// Category -> its catalogue services, in SERVICE_CATEGORIES order (used to render grouped sections).
export function catalogByCategory(categories: readonly string[]): { category: string; services: CatalogService[] }[] {
  return categories
    .map((category) => ({ category, services: SERVICE_CATALOG.filter((s) => s.category === category) }))
    .filter((g) => g.services.length > 0);
}
