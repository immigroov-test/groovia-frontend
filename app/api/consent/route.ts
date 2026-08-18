import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../lib/backend';

// Records a cookie/tracking choice server-side (BUG-143). Public: the choice is made before anyone
// signs in, and a guest's decision has to be recorded too. Any Authorization header is forwarded so
// a signed-in person's record is attributed to them.
//
// Why record it at all when the choice already lives in localStorage: GDPR Art 7(1) asks us to
// demonstrate consent, and a value in one browser that the person can clear at any time cannot do
// that. Best-effort by design - the caller ignores failures, because a banner that breaks when
// logging is down would be worse than a missing row.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const auth = req.headers.get('authorization');
  try {
    const res = await fetch(`${backendBaseUrl()}/consent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    });
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
