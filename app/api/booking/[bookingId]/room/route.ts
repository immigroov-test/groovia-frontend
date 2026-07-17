import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

// Reveal the Jitsi room for a session (auth-gated + time-gated on the backend).
export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return proxyToBackend(req, `/booking/${bookingId}/room`);
}
