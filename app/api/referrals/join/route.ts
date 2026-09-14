import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// Mentor joins the referral programme after accepting its terms.
export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/referrals/join');
}
