import { NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../lib/backend';

// Records that the token's owner joined, returns meeting_url to redirect to.
// Public - the token itself is the credential, matching immigroov's own
// no-login-required join flow.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  try {
    const res = await fetch(`${backendBaseUrl()}/booking/join/${token}`, {
      method: 'POST',
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
