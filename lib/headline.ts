import { COUNTRIES } from './countries';

// What a mentee gets help with, phrased for a headline. Keyed by EXPERTISE_CATEGORIES value.
const CATEGORY_PHRASE: Record<string, string> = {
  job_career: 'land jobs & grow your career',
  study_abroad: 'study abroad',
  visa_pr: 'navigate visas & PR',
  life_settling: 'settle into life abroad',
  work_visa: 'land a work visa',
  asylum: 'navigate asylum & refugee routes',
  family_visa: 'reunite with family',
  entrepreneur: 'start your business abroad',
};

function countryName(code?: string): string {
  if (!code) return '';
  return COUNTRIES.find((c) => c.code === code.toUpperCase())?.name || '';
}

// Join country names the way a person would: "Netherlands", "Netherlands & Germany",
// "Netherlands, Germany & Singapore".
function joinCountries(codes: string[]): string {
  const names = codes.map(countryName).filter(Boolean);
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

export interface HeadlineInput {
  domain?: string;              // primary Domain of Expertise, e.g. "Software Engineering"
  domains?: string[];           // all domains, [primary, ...additional]
  specializations?: string[];   // the mentor's own free-text specifics, e.g. "ML in production"
  years?: number | string;      // years of professional experience - the credibility signal
  countries?: string[];         // EVERY country they guide moves to (current + additional lived)
  category?: string;            // primary Area of Expertise value, e.g. "job_career"
  country?: string;             // legacy single destination; used when `countries` is absent
}

// Long enough to be specific, short enough to survive truncation in a card.
const HEADLINE_MAX = 150;

// Build a headline from the mentor's own answers, no LLM.
//
// A mentee scans a list of these to answer one question: "is this person for me?". That is decided by
// WHERE they help you get to, WHAT they do, HOW senior they are, and WHAT specifically they go deep
// on - in that order of usefulness. Everything else about the mentor (languages, price, origin) is
// shown elsewhere on the card and would only crowd the line.
//
// Degrades in the reverse order of that usefulness: when the line runs long, the second
// specialisation goes first, then both, then the years - the domain and the destinations always
// survive, because those are what the mentee is actually filtering on.
export function suggestHeadline(
  { domain, domains, specializations, years, countries, category, country }: HeadlineInput,
): string {
  const all = (domains ?? []).map((d) => (d || '').trim()).filter(Boolean);
  const primary = (domain || all[0] || '').trim();
  const secondary = all.filter((d) => d !== primary);
  const specs = (specializations ?? []).map((s) => (s || '').trim()).filter(Boolean);

  // Joining two domains with "&" reads badly when a domain already contains one.
  const pairJoin = (primary + (secondary[0] ?? '')).includes('&') ? ' + ' : ' & ';
  const base = primary
    ? (specs.length === 0 && secondary.length > 0
        ? `${primary}${pairJoin}${secondary[0]} mentor`
        : `${primary} mentor`)
    : 'Immigration & career mentor';

  const yrs = parseInt(String(years ?? ''), 10);
  const role = Number.isFinite(yrs) && yrs > 0 ? `${base} · ${yrs} yrs` : base;

  const place = joinCountries((countries ?? [country ?? '']).filter(Boolean));
  const value = category ? CATEGORY_PHRASE[category] : '';
  let tail: string;
  if (value && place) tail = `Helping you ${value} in ${place}`;
  else if (value) tail = `Helping you ${value}`;
  else if (place) tail = `Helping you move to ${place}`;
  else tail = 'Helping you move abroad';

  const candidates = [
    specs.length > 1 ? `${role} | ${specs.slice(0, 2).join(', ')} | ${tail}` : '',
    specs.length > 0 ? `${role} | ${specs[0]} | ${tail}` : '',
    `${role} | ${tail}`,
    `${base} | ${tail}`,          // drop the years before ever dropping domain or destination
  ].filter(Boolean);
  return candidates.find((c) => c.length <= HEADLINE_MAX) ?? candidates[candidates.length - 1];
}
