import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

// Record a join/leave event for the caller (for no-show detection).
export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return proxyToBackend(req, `/booking/${bookingId}/attendance`);
}
