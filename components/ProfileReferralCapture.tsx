'use client';
import { useEffect } from 'react';
import { markEntry, rememberReferral } from '../lib/referral';

/** A mentor in the referral programme: their profile URL is their referral link.
 *
 * A visit that ARRIVES here from outside the site (a shared link, a chat message, a post) is
 * credited to them. A visit that reached this page by browsing from another page of ours is not:
 * that is the mentors directory doing its job, not the mentor's promotion. document.referrer
 * cannot tell the two apart on its own, because client-side navigation never updates it, so the
 * test is whether this page is the first page of the tab's visit.
 */
export function ProfileReferralCapture({ slug }: { slug: string | null }) {
  useEffect(() => {
    if (!slug) return;
    const first = markEntry();
    if (!first) return;
    let external = true;
    try {
      const ref = document.referrer;
      if (ref) external = new URL(ref).origin !== window.location.origin;
    } catch { external = true; }
    if (external) rememberReferral(slug);
  }, [slug]);
  return null;
}
