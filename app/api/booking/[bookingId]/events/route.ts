import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../lib/backend';

// The booking's change log. Mirrors the sibling routes, but forwards the `t` query param
// too: a guest reaches their session through the signed link in their confirmation email
// and has no Authorization header, so dropping it would 403 exactly the people who most
// need to see what happened to their booking.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  const { bookingId } = await params;
  const authHeader = req.headers.get('authorization');
  const token = req.nextUrl.searchParams.get('t');
  const qs = token ? `?t=${encodeURIComponent(token)}` : '';
  try {
    const res = await fetch(`${backendBaseUrl()}/booking/${bookingId}/events${qs}`, {
      headers: { ...(authHeader ? { Authorization: authHeader } : {}) },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
