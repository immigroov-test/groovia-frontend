// BFF proxy: countries we currently have mentors in (for the find-a-mentor dropdown).
import { NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../lib/backend';

export async function GET() {
  try {
    const res = await fetch(`${backendBaseUrl()}/mentors/countries`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ countries: [] }, { status: 502 });
  }
}
