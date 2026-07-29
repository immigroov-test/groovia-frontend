import { COUNTRIES } from './countries';

function countryName(code?: string): string {
  if (!code) return '';
  return COUNTRIES.find((c) => c.code === code.toUpperCase())?.name || '';
}

export interface TagSuggestionInput {
  domains?: string[];             // Domains of Expertise, e.g. ["Software Engineering"]
  expertiseCountries?: string[];  // ISO-2 codes the mentor advises on
  homeCountry?: string;           // ISO-2
  country?: string;               // current country ISO-2
}

// Suggest editable search tags from the mentor's own answers (no LLM). These are offered as
// one-tap chips that fill the specializations field, which feeds the mentor-listing search. The
// mentor can add/remove any of them. Domains + the countries they advise on are the facets mentees
// most often search by ("Software Engineering", "Netherlands"), so those become the suggestions.
export function suggestTags({ domains, expertiseCountries, homeCountry, country }: TagSuggestionInput): string[] {
  const out: string[] = [];
  const push = (t?: string) => {
    const v = (t || '').trim();
    if (v && !out.some((x) => x.toLowerCase() === v.toLowerCase())) out.push(v);
  };
  (domains ?? []).forEach(push);
  const codes = [...(expertiseCountries ?? []), country ?? '', homeCountry ?? ''].filter(Boolean);
  codes.forEach((c) => push(countryName(c)));
  return out;
}
