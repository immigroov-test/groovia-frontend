// BFF proxy: topic + country facets for the find-a-mentor dropdowns (dependent, auto-expanding).
import { NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../lib/backend';

export async function GET() {
  try {
    const res = await fetch(`${backendBaseUrl()}/mentors/facets`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ categories: [], countries: [], by_category: {} }, { status: 502 });
  }
}
