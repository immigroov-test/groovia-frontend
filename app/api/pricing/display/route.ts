import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';
import { geoForwardHeaders } from '../../../../lib/edgeGeo';

// Session-price-only display pricing for cards + the booking page, using the SAME per-service engine
// as the binding quote (explicit currency + PPP), so the session price shown equals the checkout
// session line and only the disclosed platform fee + tax are added at checkout (BUG-077). Public,
// soft FX (falls back to the mentor-currency price). Forwards the trusted edge country.
export async function POST(req: NextRequest) {
  return proxyPublic(req, '/pricing/display', { headers: geoForwardHeaders(req) });
}
