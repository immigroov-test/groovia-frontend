import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../../lib/backend';

// Admin: freeze or reactivate an affiliate's referral channel.
export async function POST(req: NextRequest, { params }: { params: Promise<{ affiliateId: string }> }) {
  const { affiliateId } = await params;
  return proxyToBackend(req, `/referrals/admin/affiliates/${affiliateId}/status`);
}
