import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

// Role-aware session detail (candidate / mentor / admin). Auth + authorization on the backend.
export async function GET(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return proxyToBackend(req, `/booking/${bookingId}/detail`);
}
