'use client';
import { useEffect } from 'react';
import { detectCountry } from '../lib/geo';
import { consentMode, readConsent } from '../lib/consent';
import { REFERRAL_COOKIE, REFERRAL_WINDOW_DAYS, referralToken } from '../lib/referral';

const PENDING_KEY = 'groovia.pendingRef';

/** Records a referral link click, but only once the visitor's cookie choice allows it.
 *
 * Attribution is a marketing cookie, not a strictly-necessary one: it exists to pay a promoter,
 * not to deliver the service someone asked for. So in the opt-in regions nothing is written, here
 * or on the server, until they agree. /r/<slug> hands the code over in the URL and this holds it
 * in sessionStorage until the answer is yes. Where no banner is required it proceeds immediately,
 * and in the opt-out regions it proceeds until someone says no.
 *
 * The rules come from lib/consent, the same place CookieConsent reads them, so the banner can
 * never promise one thing while this does another.
 */
export function ReferralCapture() {
  useEffect(() => {
    // Take the code off the URL straight away: it should not survive a copy-paste or a share,
    // or one person's link ends up crediting them for someone else's booking.
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('ref');
    if (fromUrl) {
      try { sessionStorage.setItem(PENDING_KEY, fromUrl); } catch { /* private mode */ }
      url.searchParams.delete('ref');
      window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }

    let cancelled = false;
    let country: string | undefined;

    async function attempt() {
      let slug: string | null = null;
      try { slug = sessionStorage.getItem(PENDING_KEY); } catch { /* ignore */ }
      if (!slug || cancelled) return;

      if (country === undefined) country = (await detectCountry()) || '';
      if (cancelled) return;

      const mode = consentMode(country);
      const consent = readConsent();
      const allowed =
        mode === 'none' ? true
          : mode === 'optout' ? consent?.marketing !== false
            : consent?.marketing === true;
      if (!allowed) return;

      try {
        const res = await fetch('/api/referrals/click', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          // An existing token keeps one identity across two different links, and lets the
          // database decide which click wins rather than the browser.
          body: JSON.stringify({ slug, token: referralToken() }),
        });
        const data = await res.json().catch(() => ({}));
        if (!data?.ok || typeof data.token !== 'string') return;

        const secure = window.location.protocol === 'https:' ? '; secure' : '';
        document.cookie =
          `${REFERRAL_COOKIE}=${encodeURIComponent(data.token)}; path=/; ` +
          `max-age=${REFERRAL_WINDOW_DAYS * 24 * 60 * 60}; samesite=lax${secure}`;
        try { sessionStorage.removeItem(PENDING_KEY); } catch { /* ignore */ }
      } catch {
        // A failed click costs the promoter this attribution and nothing else. Left pending so
        // the next page load tries again.
      }
    }

    void attempt();
    const onConsent = () => { void attempt(); };
    window.addEventListener('groovia:consent', onConsent);
    return () => { cancelled = true; window.removeEventListener('groovia:consent', onConsent); };
  }, []);

  return null;
}
