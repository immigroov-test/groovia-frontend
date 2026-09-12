// Referral link attribution, browser side.
//
// The token identifies a BROWSER, not a person. It is written when someone opens a promoter's
// link and read back at checkout, which is how a click weeks earlier still earns that promoter
// their commission. The window is enforced in the database, not here.
//
// Deliberately not httpOnly: checkout reads it from client JS to send with the booking. It is not
// a credential and grants nothing on its own, because a made-up value matches no logged click and
// so attributes nothing.
export const REFERRAL_COOKIE = 'groovia_ref';

/** Mirrors referral_attribution_days. The database is authoritative; this only decides how
 *  long the browser bothers to keep the token. */
export const REFERRAL_WINDOW_DAYS = 60;

export function referralToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${REFERRAL_COOKIE}=`;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  if (!hit) return undefined;
  return decodeURIComponent(hit.slice(prefix.length)) || undefined;
}
