import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';

// Reveal the Jitsi room for a session (auth-gated + time-gated on the backend).
export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const t = req.nextUrl.searchParams.get('t');
  // Forward the signed access token so a guest (no account) can act on their
  // own booking. Absent for signed-in users, who are authorised by session.
  return proxyPublic(req, `/booking/${bookingId}/room${t ? `?t=${encodeURIComponent(t)}` : ''}`);
}
