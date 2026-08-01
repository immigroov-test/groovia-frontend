import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

// Public: validate a referral code at checkout (guest-allowed). The backend is authoritative.
export async function POST(req: NextRequest) {
  return proxyPublic(req, '/referrals/validate');
}
