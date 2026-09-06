import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../../lib/backend';

export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { bookingId } = await params;
  try {
    const res = await fetch(`${backendBaseUrl()}/admin/bookings/${encodeURIComponent(bookingId)}/commission`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: await req.text(),
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
