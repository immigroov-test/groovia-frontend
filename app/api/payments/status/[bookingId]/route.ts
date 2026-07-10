import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';

// Cheap read-only booking-status poll for the checkout page while it waits for
// the webhook/verify to land. Guest-allowed.
export async function GET(req: NextRequest, ctx: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await ctx.params;
  return proxyPublic(req, `/payments/status/${bookingId}`);
}
