import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../lib/backend';

// Mentee counter-proposes a different date ("Ask another date"); the mentor re-proposes times.
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const body = await req.text();
  try {
    const res = await fetch(`${backendBaseUrl()}/booking/reschedule/request-date`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(authHeader ? { Authorization: authHeader } : {}) },
      body,
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
