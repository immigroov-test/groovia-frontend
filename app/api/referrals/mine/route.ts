import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// A mentor's own referral codes + promoter earnings.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/referrals/mine');
}
