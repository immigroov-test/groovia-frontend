import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// Admin: all recent reviews (including hidden) for moderation.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/reviews/admin');
}
