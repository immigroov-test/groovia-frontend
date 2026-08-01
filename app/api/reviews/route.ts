import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../lib/backend';

// Mentee submits/edits a review for a completed session.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/reviews');
}
