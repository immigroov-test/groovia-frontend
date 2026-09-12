import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

// Admin: list payout batches, or build the one for a given date.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, '/referrals/admin/payout-batches');
}

export async function POST(req: NextRequest) {
  return proxyToBackend(req, '/referrals/admin/payout-batches');
}
