import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../lib/backend';

// Pre-login existence check (no email sent). Used by the auth popup to route existing
// users straight to the login link and only ask new users for their name.
export async function POST(req: NextRequest) {
  const body = await req.text();
  try {
    const res = await fetch(`${backendBaseUrl()}/auth/check-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
