import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../lib/backend';

// Public endpoint (no auth) - the contact form is available to guests. Forwards the
// message to the backend, which emails the support inbox.
export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const res = await fetch(`${backendBaseUrl()}/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
