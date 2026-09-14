import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// Mentor leaves the referral programme; every open attribution tied to them ends.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/referrals/leave');
}
