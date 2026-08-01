import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// Mentor generates a new referral code.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/referrals/codes');
}
