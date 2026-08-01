import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../lib/backend';

// Admin: approve / reject / mark-paid / void a referral commission.
export async function POST(req: NextRequest, { params }: { params: Promise<{ ledgerId: string }> }) {
  const { ledgerId } = await params;
  return proxyToBackend(req, `/referrals/admin/commission/${ledgerId}`);
}
