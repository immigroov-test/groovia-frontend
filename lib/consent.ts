// Cookie / tracking consent model (BUG-143).
//
// Self-hosted rather than a hosted CMP. A CMP would itself be a sub-processor to declare in the
// privacy policy, and would load a third-party script, to solve a problem we barely have yet: today
// the only non-essential third party is reCAPTCHA. When PostHog (FEAT-029) lands this becomes
// mandatory in the EU, which is why it exists now rather than later.
//
// The regions differ in MODEL, not just wording, so this is not one banner with translated text:
//   EU / EEA / UK   opt-in.  Nothing non-essential may load before the person agrees, and refusing
//                            must be as easy as accepting (GDPR + ePrivacy).
//   California      opt-out. No blocking banner; a standing "Do Not Sell or Share" control.
//   elsewhere       generally nothing required, so we do not interrupt.

export type ConsentMode = 'optin' | 'optout' | 'none';

export interface ConsentState {
  /** Product analytics (PostHog when it lands). */
  analytics: boolean;
  /** Advertising / retargeting. Nothing uses this yet; here so adding it later is a no-op. */
  marketing: boolean;
  /** Which wording was agreed to, so a later change does not silently reinterpret an old choice. */
  version: string;
  ts: string;
}

/** Bump when the categories or the wording change; an older stored version re-asks. */
export const CONSENT_VERSION = '2026-08-18';

const KEY = 'groovia.consent';

// EEA (EU 27 + Iceland, Liechtenstein, Norway) plus the UK and Switzerland. Switzerland's revFADP
// is close enough in practice that treating it as opt-in is the safe side of the line.
const OPT_IN_COUNTRIES = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV',
  'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  'IS', 'LI', 'NO', 'GB', 'CH',
]);

// Opt-out regimes. State-level in the US, and we only have the country from IP geo, so US is treated
// as opt-out wholesale: showing the control to everyone in the US is harmless and errs safe.
const OPT_OUT_COUNTRIES = new Set(['US']);

export function consentMode(country: string | undefined | null): ConsentMode {
  const c = (country || '').toUpperCase();
  if (!c) return 'optin';                      // unknown geo: assume the strictest regime
  if (OPT_IN_COUNTRIES.has(c)) return 'optin';
  if (OPT_OUT_COUNTRIES.has(c)) return 'optout';
  return 'none';
}

export function readConsent(): ConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ConsentState;
    // A stored decision against older wording is not a decision about the current one.
    if (s.version !== CONSENT_VERSION) return null;
    return s;
  } catch {
    return null;
  }
}

export function writeConsent(choice: { analytics: boolean; marketing: boolean }): ConsentState {
  const state: ConsentState = { ...choice, version: CONSENT_VERSION, ts: new Date().toISOString() };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private mode / quota: the in-memory decision still holds for this page */
  }
  // Tell listeners in the same tab; the storage event only fires in OTHER tabs.
  window.dispatchEvent(new CustomEvent('groovia:consent', { detail: state }));
  return state;
}

/** Has the person allowed analytics? False until they say otherwise, in every region. */
export function analyticsAllowed(): boolean {
  return readConsent()?.analytics === true;
}
