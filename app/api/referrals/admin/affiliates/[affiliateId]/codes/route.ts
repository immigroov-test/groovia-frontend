import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../../lib/backend';

// Admin: issue another code for an affiliate.
export async function POST(req: NextRequest, { params }: { params: Promise<{ affiliateId: string }> }) {
  const { affiliateId } = await params;
  return proxyToBackend(req, `/referrals/admin/affiliates/${affiliateId}/codes`);
}
