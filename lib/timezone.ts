// Human-friendly timezone labels. An IANA zone like "Europe/Berlin" becomes
// "Berlin (GMT+2)", "Asia/Kolkata" becomes "Kolkata (GMT+5:30)", and a bare "UTC"
// becomes "UTC (GMT+0)". The GMT offset disambiguates same-named cities and makes
// "UTC" understandable to people who don't know what it means.

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
