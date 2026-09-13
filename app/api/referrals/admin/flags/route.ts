import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

// Admin: the referral review queue (open fraud flags with their case file).
export async function GET(req: NextRequest) {
  const resolved = req.nextUrl.searchParams.get('include_resolved') === 'true';
  return proxyToBackend(req, `/referrals/admin/flags?include_resolved=${resolved}`);
}
