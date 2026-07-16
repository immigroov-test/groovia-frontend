import { NextRequest } from 'next/server';

// The visitor's country/city as computed by Vercel's edge network, set from the
// real connection (the browser cannot forge these). Present in Vercel production;
// empty in local dev. https://vercel.com/docs/edge-network/headers
export function edgeGeo(req: NextRequest): { country: string | null; city: string | null } {
  const country = (req.headers.get('x-vercel-ip-country') || '').toUpperCase();
  const cityRaw = req.headers.get('x-vercel-ip-city') || '';
  let city = '';
  try { city = cityRaw ? decodeURIComponent(cityRaw) : ''; } catch { city = cityRaw; }
  return {
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    city: city || null,
  };
}

// Headers that forward the trusted edge country to the backend, signed with the
// shared INTERNAL_GEO_TOKEN so the backend can tell our BFF apart from a direct,
// spoofed call. Returns {} when the edge country or the token is unavailable, in
// which case the backend falls back to its configured behaviour. INTERNAL_GEO_TOKEN
// is a server-only env var (never NEXT_PUBLIC), so it stays secret.
export function geoForwardHeaders(req: NextRequest): Record<string, string> {
  const { country } = edgeGeo(req);
  const token = process.env.INTERNAL_GEO_TOKEN;
  if (!country || !token) return {};
  return { 'X-Geo-Country': country, 'X-Internal-Geo-Token': token };
}
