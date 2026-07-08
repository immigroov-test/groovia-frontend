import { NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../lib/backend';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ webinarId: string }> },
) {
  const { webinarId } = await params;
  try {
    const res = await fetch(`${backendBaseUrl()}/webinars/${webinarId}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
