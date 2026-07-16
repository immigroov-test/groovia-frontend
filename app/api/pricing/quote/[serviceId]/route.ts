import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';
import { geoForwardHeaders } from '../../../../../lib/edgeGeo';

// Binding 10-min price quote for a service. Public. The customer's country is
// forwarded as the trusted edge geo (signed X-Geo-Country) so the charged amount
// can't be spoofed; the client ?country= is passed only as a pre-enforcement
// fallback (used by the backend when INTERNAL_GEO_TOKEN isn't configured).
export async function GET(req: NextRequest, ctx: { params: Promise<{ serviceId: string }> }) {
  const { serviceId } = await ctx.params;
  const country = new URL(req.url).searchParams.get('country');
  const qs = country ? `?country=${encodeURIComponent(country)}` : '';
  return proxyPublic(req, `/pricing/quote/${serviceId}${qs}`, { headers: geoForwardHeaders(req) });
}
