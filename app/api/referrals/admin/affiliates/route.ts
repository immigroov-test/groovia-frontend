import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

// Admin: create a non-mentor influencer with their link (and a code when a discount is given).
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/referrals/admin/affiliates');
}
