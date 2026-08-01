import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../lib/backend';

// Admin: hide/unhide a review.
export async function POST(req: NextRequest, { params }: { params: Promise<{ reviewId: string }> }) {
  const { reviewId } = await params;
  return proxyToBackend(req, `/reviews/admin/${reviewId}/hidden`);
}
