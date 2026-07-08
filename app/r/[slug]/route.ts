import { NextResponse, type NextRequest } from 'next/server';
import { backendBaseUrl } from '../../../lib/backend';

// Referral link landing page. Logs the click server-side, drops a session
// cookie for the checkout page to read later, and redirects into the site.
// Unknown slugs redirect too (log_referral_click no-ops silently on the
// backend) — a bad referral link should never break someone's visit.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sessionToken = crypto.randomUUID();

  try {
    await fetch(`${backendBaseUrl()}/referrals/click`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, session_token: sessionToken }),
      cache: 'no-store',
    });
  } catch {
    // Never block the redirect on a logging failure.
  }

  const res = NextResponse.redirect(new URL('/', request.url));
  res.cookies.set('ig_ref', sessionToken, {
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90 days — comfortably past the attribution window
    sameSite: 'lax',
  });
  return res;
}
