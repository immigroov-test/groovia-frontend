import { NextRequest, NextResponse } from 'next/server';
import { edgeGeo } from '../../../lib/edgeGeo';

// The visitor's country/city from Vercel's edge (the single source of truth also
// used for pricing). The client uses this for the location badge and the display
// currency, so what's shown always matches what the backend prices/charges. Empty
// fields in local dev (no edge headers), where the client falls back to IP APIs.
export function GET(req: NextRequest) {
  const { country, city } = edgeGeo(req);
  return NextResponse.json({ country, city }, { headers: { 'Cache-Control': 'no-store' } });
}
