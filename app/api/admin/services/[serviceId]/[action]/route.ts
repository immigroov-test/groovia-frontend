import { NextRequest, NextResponse } from 'next/server';
import { backendBaseUrl } from '../../../../../../lib/backend';

export async function POST(req: NextRequest, { params }: { params: Promise<{ serviceId: string; action: string }> }) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { serviceId, action } = await params;
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
  try {
    const res = await fetch(`${backendBaseUrl()}/admin/services/${serviceId}/${action}`, {
      method: 'POST',
      headers: { Authorization: authHeader },
      cache: 'no-store',
    });
    return NextResponse.json(await res.json(), { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Failed to reach backend' }, { status: 502 });
  }
}
