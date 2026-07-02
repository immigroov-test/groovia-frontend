import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../lib/backend';

// Owner-only: available slots for rescheduling a booking (its own mentor + service).
export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const authHeader = req.headers.get('authorization');
  const qs = new URL(req.url).search;
  try {
    const res = await fetch(`${backendBaseUrl()}/booking/${bookingId}/reschedule-slots${qs}`, {
      headers: { ...(authHeader ? { Authorization: authHeader } : {}) },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
