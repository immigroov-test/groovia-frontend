import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';

// Record a join/leave event for the caller (for no-show detection).
export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const t = req.nextUrl.searchParams.get('t');
  // Forward the signed access token so a guest (no account) can act on their
  // own booking. Absent for signed-in users, who are authorised by session.
  return proxyPublic(req, `/booking/${bookingId}/attendance${t ? `?t=${encodeURIComponent(t)}` : ''}`);
}
