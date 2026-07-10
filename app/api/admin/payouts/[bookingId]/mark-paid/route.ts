import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../lib/backend';

// Admin-only: record a manual payout as paid.
export async function POST(req: NextRequest, ctx: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await ctx.params;
  return proxyToBackend(req, `/admin/payouts/${bookingId}/mark-paid`);
}
