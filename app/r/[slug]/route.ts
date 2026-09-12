import { NextRequest, NextResponse } from 'next/server';

// Step 1 of the referral flow: a promoter's link is opened.
//
// This route only carries the code into the app. Nothing is stored and no click is logged here,
// because referral attribution is a marketing cookie: in the EU, UK, Switzerland and India none of
// it may be written before the visitor agrees. ReferralCapture does both once consent allows it,
// reading the same rules the cookie banner uses so the two cannot disagree.
//
// An unknown or retired slug still lands on the site. A dead link should look like an ordinary
// visit, not an error page with someone's tracking code printed on it.
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // ?next= keeps deep links working, e.g. a promoter sharing one mentor's page. Relative paths
  // only, so the link cannot be reused to bounce someone off our domain.
  const next = req.nextUrl.searchParams.get('next');
  const dest = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';

  const url = new URL(dest, req.nextUrl.origin);
  url.searchParams.set('ref', slug);
  return NextResponse.redirect(url);
}
