import { NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../lib/backend';

// Proxies the daily quote from the backend. Cached for an hour at the edge so the
// popup doesn't hit the backend on every open. The popup falls back to the default
// quote in lib/content.ts if this is unreachable.
export async function GET() {
  try {
    const r = await fetch(`${backendBaseUrl()}/quote/today`, { next: { revalidate: 3600 } });
    if (!r.ok) return NextResponse.json({ error: 'unavailable' }, { status: 502 });
    return NextResponse.json(await r.json());
  } catch {
    return NextResponse.json({ error: 'unavailable' }, { status: 502 });
  }
}
