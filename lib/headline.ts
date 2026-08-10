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

export interface HeadlineInput {
  domain?: string;              // primary Domain of Expertise, e.g. "Software Engineering"
  domains?: string[];           // all domains, [primary, ...additional]
  specializations?: string[];   // the mentor's own free-text specifics, e.g. "ML in production"
  category?: string;            // primary Area of Expertise value, e.g. "job_career"
  country?: string;             // destination country ISO-2 (the mentor's current country)
}

// A headline reads best around this length: long enough to be specific, short enough to survive
// truncation in a card or a search result.
const HEADLINE_MAX = 120;

// Build a headline from the mentor's own answers, no LLM.
//
// BUG-128: this used to be only "<domain> mentor | Helping you <x> in <y>", which read the same for
// every mentor in a domain and threw away the two most distinguishing things they'd told us: their
// specialisations and their second domain. The middle segment now carries those, so two Data Science
// mentors don't end up advertising themselves identically. It still degrades gracefully as fields
// fill in, and drops the middle rather than blow past HEADLINE_MAX.
export function suggestHeadline({ domain, domains, specializations, category, country }: HeadlineInput): string {
  const all = (domains ?? []).map((d) => (d || '').trim()).filter(Boolean);
  const primary = (domain || all[0] || '').trim();
  const secondary = all.filter((d) => d !== primary);

  // Role: primary domain, plus a second one when the mentor has no specialisations to show instead.
  const specs = (specializations ?? []).map((s) => (s || '').trim()).filter(Boolean);
  // Joining two domains with "&" produces "Data Science & AI & Web Development" when a domain already
  // contains one, so use "+" whenever either side does.
  const pairJoin = (primary + (secondary[0] ?? '')).includes('&') ? ' + ' : ' & ';
  const role = primary
    ? (specs.length === 0 && secondary.length > 0
        ? `${primary}${pairJoin}${secondary[0]} mentor`
        : `${primary} mentor`)
    : 'Immigration & career mentor';

  const value = category ? CATEGORY_PHRASE[category] : '';
  const place = countryName(country);

  let tail: string;
  if (value && place) tail = `Helping you ${value} in ${place}`;
  else if (value) tail = `Helping you ${value}`;
  else if (place) tail = `Helping you move to ${place}`;
  else tail = 'Helping you move abroad';

  // The specifics they go deep on, capped at two so the headline stays readable.
  const middle = specs.slice(0, 2).join(', ');
  if (middle) {
    const full = `${role} | ${middle} | ${tail}`;
    if (full.length <= HEADLINE_MAX) return full;
    const one = `${role} | ${specs[0]} | ${tail}`;
    if (one.length <= HEADLINE_MAX) return one;
  }
  return `${role} | ${tail}`;
}
