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

/** Where a pending referral slug waits until consent allows it to be recorded. */
export const PENDING_KEY = 'groovia.pendingRef';
const ENTRY_KEY = 'groovia.entry';

/** Hand a referral slug to ReferralCapture, which records it once the cookie choice allows. */
export function rememberReferral(slug: string): void {
  try { sessionStorage.setItem(PENDING_KEY, slug); } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent('groovia:ref'));
}

/** True on the first page of this tab's visit, false on every page reached by navigating within
 *  the site afterwards. Client-side navigation never updates document.referrer, so this is what
 *  tells an arrival from outside apart from ordinary browsing. */
export function markEntry(): boolean {
  try {
    if (sessionStorage.getItem(ENTRY_KEY)) return false;
    sessionStorage.setItem(ENTRY_KEY, window.location.pathname);
    return true;
  } catch {
    return false;
  }
}

export function referralToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const prefix = `${REFERRAL_COOKIE}=`;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(prefix));
  if (!hit) return undefined;
  return decodeURIComponent(hit.slice(prefix.length)) || undefined;
}
