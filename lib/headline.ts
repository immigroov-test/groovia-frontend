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
  domain?: string;      // primary Domain of Expertise, e.g. "Software Engineering"
  category?: string;    // primary Area of Expertise value, e.g. "job_career"
  country?: string;     // destination country ISO-2 (the mentor's current country)
}

// Build a headline from the mentor's own answers, no LLM. Mirrors the "Role | value prop"
// style ("AI Engineer | Helping you land AI & software roles abroad"). Degrades gracefully
// as fields fill in, so it stays sensible whether the mentor has entered one field or all.
export function suggestHeadline({ domain, category, country }: HeadlineInput): string {
  const role = domain ? `${domain} mentor` : 'Immigration & career mentor';
  const value = category ? CATEGORY_PHRASE[category] : '';
  const place = countryName(country);

  let tail: string;
  if (value && place) tail = `Helping you ${value} in ${place}`;
  else if (value) tail = `Helping you ${value}`;
  else if (place) tail = `Helping you move to ${place}`;
  else tail = 'Helping you move abroad';

  return `${role} | ${tail}`;
}
