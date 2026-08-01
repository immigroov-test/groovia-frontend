import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

// The caller's own review for a booking (prefill the edit form).
export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return proxyToBackend(req, `/reviews/my/${bookingId}`);
}
