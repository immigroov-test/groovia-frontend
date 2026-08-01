import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';

// Public: a mentor's visible reviews.
export async function GET(req: NextRequest, { params }: { params: Promise<{ mentorId: string }> }) {
  const { mentorId } = await params;
  return proxyPublic(req, `/reviews/mentor/${mentorId}`);
}
