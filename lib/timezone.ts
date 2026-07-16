// Human-friendly timezone labels. An IANA zone like "Europe/Berlin" becomes
// "Berlin (GMT+2)", "Asia/Kolkata" becomes "Kolkata (GMT+5:30)", and a bare "UTC"
// becomes "UTC (GMT+0)". The GMT offset disambiguates same-named cities and makes
// "UTC" understandable to people who don't know what it means.
import { COUNTRY_TIMEZONES } from './countryTimezones';

export function tzCity(tz: string): string {
  if (!tz) return '';
  return (tz.split('/').pop() ?? tz).replace(/_/g, ' ');
}

// Current GMT offset for a zone, e.g. "GMT+2", "GMT-5", "GMT+5:30". UTC reports a
// bare "GMT", which we normalize to "GMT+0" for clarity.
export function tzOffset(tz: string, at: Date = new Date()): string {
  try {
    const name = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value ?? '';
    return name === 'GMT' ? 'GMT+0' : name;
  } catch {
    return '';
  }
}

// "Berlin (GMT+2)", "Kolkata (GMT+5:30)", "UTC (GMT+0)".
export function tzShort(tz: string): string {
  if (!tz) return '';
  const city = tzCity(tz);
  const off = tzOffset(tz);
  return off ? `${city} (${off})` : city;
}

// Primary IANA zone for an ISO-3166 alpha-2 country, or '' if unknown.
export function countryTimezone(country?: string | null): string {
  if (!country) return '';
  return COUNTRY_TIMEZONES[country.toUpperCase()] ?? '';
}

// The zone to LABEL as the visitor's own. The browser's zone (their OS clock) is the
// source of truth for the actual times, but if the IP-detected location resolves to a
// zone with the SAME current offset, we prefer that zone's city so the label matches
// the location badge (a visitor in Tilburg whose OS is set to Berlin reads "Amsterdam",
// not "Berlin" - the clock is identical). A real traveler/VPN whose offset differs keeps
// their browser zone, so displayed times stay correct.
export function userDisplayTz(browserTz: string, country?: string | null): string {
  const locTz = countryTimezone(country);
  if (locTz && locTz !== browserTz && tzOffset(locTz) === tzOffset(browserTz)) return locTz;
  return browserTz;
}

// The zone to show for a mentor. Their stored zone wins when it's a real IANA zone;
// seed/placeholder rows store a bare 'UTC', so fall back to the zone implied by the
// mentor's country (e.g. GB -> Europe/London) instead of showing an opaque "UTC".
export function mentorDisplayTz(storedTz?: string | null, country?: string | null): string {
  const tz = (storedTz || '').trim();
  if (tz && tz.toUpperCase() !== 'UTC' && tz.includes('/')) return tz;
  return countryTimezone(country) || tz || 'UTC';
}
