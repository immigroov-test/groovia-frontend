import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../lib/backend';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> },
) {
  const { serviceId } = await params;
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country') || '';
  const qs = new URLSearchParams();
  if (country) qs.set('country', country);

  try {
    const res = await fetch(
      `${backendBaseUrl()}/pricing/quote/${serviceId}?${qs}`,
      { cache: 'no-store' },
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
