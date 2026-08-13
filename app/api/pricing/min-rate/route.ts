import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../lib/backend';

// The minimum base rate, expressed in the currency the mentor is pricing in. The floor lives on the
// backend (one INR figure, converted) so the form and the server cannot disagree about it.
export async function GET(req: NextRequest) {
  const currency = req.nextUrl.searchParams.get('currency') || 'INR';
  try {
    const res = await fetch(`${backendBaseUrl()}/pricing/min-rate?currency=${encodeURIComponent(currency)}`, {
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
