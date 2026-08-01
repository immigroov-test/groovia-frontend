import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

// Admin: one row per affiliate with code + referral + money aggregates.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/referrals/admin/overview');
}
