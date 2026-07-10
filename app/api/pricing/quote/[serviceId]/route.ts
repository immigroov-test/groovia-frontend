import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';

// Binding 10-min price quote for a service + customer country. Public. The
// ?country=XX query is forwarded through to the backend.
export async function GET(req: NextRequest, ctx: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await ctx.params;
  const country = new URL(req.url).searchParams.get('country');
  const qs = country ? `?country=${encodeURIComponent(country)}` : '';
  return proxyPublic(req, `/pricing/quote/${serviceId}${qs}`);
}
