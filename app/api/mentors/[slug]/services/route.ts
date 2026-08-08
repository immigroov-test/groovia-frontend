import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../lib/backend';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  try {
    // No caching: prices are derived from the mentor's base rate and can change any time, so the
    // booking page must always show the latest set_price (a stale 60s cache showed old prices right
    // after a mentor updated their rate). The load is trivial (one mentor's few services).
    const res = await fetch(`${backendBaseUrl()}/mentor/services/public/${slug}`, {
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
