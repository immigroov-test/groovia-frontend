import { NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../../lib/backend';

// Read-only "waiting room" status check - public, the token itself is the
// credential (matches immigroov's own no-login-required join flow).
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  try {
    const res = await fetch(`${backendBaseUrl()}/booking/join/${token}/check`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
