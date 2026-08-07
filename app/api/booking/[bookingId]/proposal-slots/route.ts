import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../lib/backend';

// Owner-only: the real, bookable slots inside the mentor's proposed reschedule range (BUG-085).
export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const authHeader = req.headers.get('authorization');
  try {
    const res = await fetch(`${backendBaseUrl()}/booking/${bookingId}/proposal-slots`, {
      headers: { ...(authHeader ? { Authorization: authHeader } : {}) },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
