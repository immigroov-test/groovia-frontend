import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

// BUG-62: mentor-facing price preview across our key markets. Pure FX + PPP math on the mentor's own
// base rate / currency / smart-pricing inputs, so it's public and doesn't need the edge country.
export async function POST(req: NextRequest) {
  return proxyPublic(req, '/pricing/preview');
}
