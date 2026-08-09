import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

// BUG-103: mentor-facing "what will customers in major markets see" preview for the rate editor.
// Public, stateless - just forwards the mentor's typed-in rate/currency/toggle to the backend's
// PPP+FX engine (same formula as checkout, fee/tax-free).
export async function POST(req: NextRequest) {
  return proxyPublic(req, '/pricing/preview-regions');
}
