import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';
import { geoForwardHeaders } from '../../../../lib/edgeGeo';

// Soft display-pricing conversion (customer currency + PPP discount) for showing
// the localized original/discounted price before checkout. Public, never fails on
// stale FX (falls back to the mentor-currency price with fx_ok=false). Forwards the
// trusted edge country so the DISPLAYED price matches the CHARGED price exactly.
export async function POST(req: NextRequest) {
  return proxyPublic(req, '/pricing/convert', { headers: geoForwardHeaders(req) });
}
