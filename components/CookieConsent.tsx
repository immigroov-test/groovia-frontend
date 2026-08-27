'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, X } from 'lucide-react';
import { detectCountry } from '../lib/geo';
import { FEATURES } from '../lib/features';
import {
  CONSENT_VERSION, consentMode, readConsent, writeConsent,
  type ConsentMode, type ConsentState,
} from '../lib/consent';

/** Cookie / tracking consent banner (BUG-143).
 *
 * Renders nothing at all outside the regions that require it, so most visitors are never
 * interrupted. In the EU/EEA/UK it is opt-in: "Reject" sits beside "Accept" with equal weight,
 * because ePrivacy requires refusing to be as easy as agreeing, and a banner where the reject path
 * is buried behind "Manage" is the single most commonly cited dark pattern.
 *
 * Deliberately NOT blocking. Nothing non-essential loads before a choice is made, so there is no
 * need to trap the page behind an overlay: the strictly-necessary auth cookies are exempt, and
 * reCAPTCHA is classed as security rather than tracking, which is why refusing breaks nothing.
 */
export function CookieConsent() {
  const [mode, setMode] = useState<ConsentMode | null>(null);
  const [decided, setDecided] = useState<ConsentState | null>(null);
  const [open, setOpen] = useState(false);      // the details panel
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!FEATURES.cookieConsent) return;
    setDecided(readConsent());
    let cancelled = false;
    detectCountry().then((c) => { if (!cancelled) setMode(consentMode(c)); });
    return () => { cancelled = true; };
  }, []);

  function save(choice: { analytics: boolean; marketing: boolean }) {
    const state = writeConsent(choice);
    setDecided(state);
    setOpen(false);
    // Record it server-side too: a decision that only exists in one browser cannot be demonstrated
    // later, and localStorage is cleared routinely. Fire-and-forget; a failure must not block the UI.
    void fetch('/api/consent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: 'cookies', ...choice, policy_version: CONSENT_VERSION }),
    }).catch(() => {});
  }

  if (!FEATURES.cookieConsent || mode === null) return null;
  if (mode === 'none') return null;                     // no requirement here, do not interrupt

  // Already chosen: leave a way back in rather than a banner. Required in opt-out regions, and good
  // practice everywhere, since consent has to be withdrawable as easily as it was given.
  if (decided && !open) {
    return (
      // A plain underlined link rather than a pill: as a button it occupied enough of a phone screen
      // to sit on top of the chat's intent buttons, which are also bottom-anchored. It still has to
      // be reachable from anywhere, since withdrawing consent must be as easy as giving it, so it
      // stays fixed and simply recedes instead of competing.
      <button
        type="button"
        onClick={() => { setAnalytics(decided.analytics); setMarketing(decided.marketing); setOpen(true); }}
        className="fixed bottom-1.5 left-2.5 z-40 text-[10px] sm:text-[11px] leading-none text-muted/70 underline underline-offset-2 hover:text-brand-900"
      >
        {mode === 'optout' ? 'Privacy choices' : 'Cookie settings'}
      </button>
    );
  }

  const optOut = mode === 'optout';

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-2xl border border-[--color-border] bg-card p-4 sm:p-5 shadow-2xl">
        {open && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="float-right p-1 text-brand-500 hover:text-brand-900"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="flex items-start gap-3">
          <span className="hidden sm:grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700">
            <Cookie className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-brand-900">
              {optOut ? 'Your privacy choices' : 'Cookies on Immigroov'}
            </p>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              {optOut
                ? 'We use cookies to run the site. You can opt out of analytics at any time.'
                : 'We need some cookies to sign you in and keep the site secure. Analytics are optional and off until you say yes.'}{' '}
              <Link href="/privacy#cookie-policy" target="_blank" className="text-brand-700 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>

        {open && (
          <div className="mt-4 space-y-2.5 border-t border-[--color-border] pt-3.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-brand-900">Strictly necessary</p>
                <p className="text-xs text-muted">Signing in, security, and remembering your session. Cannot be turned off.</p>
              </div>
              <span className="shrink-0 text-xs text-muted">Always on</span>
            </div>
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-xs font-medium text-brand-900">Analytics</p>
                <p className="text-xs text-muted">Which pages get used, so we can improve them.</p>
              </div>
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)}
                className="mt-0.5 shrink-0 accent-brand-700" />
            </label>
            <label className="flex items-start justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-xs font-medium text-brand-900">Marketing</p>
                <p className="text-xs text-muted">Not used today. Listed so you can decide in advance.</p>
              </div>
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)}
                className="mt-0.5 shrink-0 accent-brand-700" />
            </label>
          </div>
        )}

        {/* Reject and Accept carry equal weight. Burying refusal behind "Manage" is the dark pattern
            regulators name most often, and it is what makes a banner non-compliant. */}
        <div className="mt-4 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
          {!open && (
            <button type="button" onClick={() => setOpen(true)}
              className="text-xs text-muted hover:text-brand-900 sm:mr-auto underline underline-offset-4">
              Manage
            </button>
          )}
          {open ? (
            <button type="button" onClick={() => save({ analytics, marketing })}
              className="h-9 rounded-lg bg-brand-600 px-4 text-xs font-medium text-white hover:bg-brand-700">
              Save choices
            </button>
          ) : (
            <>
              <button type="button" onClick={() => save({ analytics: false, marketing: false })}
                className="h-9 rounded-lg border border-[--color-border] bg-white px-4 text-xs font-medium text-brand-900 hover:bg-brand-50">
                Reject all
              </button>
              <button type="button" onClick={() => save({ analytics: true, marketing: true })}
                className="h-9 rounded-lg bg-brand-600 px-4 text-xs font-medium text-white hover:bg-brand-700">
                Accept all
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
