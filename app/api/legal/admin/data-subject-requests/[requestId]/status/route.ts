import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../../lib/backend';

export async function POST(req: NextRequest, { params }: { params: Promise<{ requestId: string }> }) {
  const { requestId } = await params;
  return proxyToBackend(req, `/legal/admin/data-subject-requests/${requestId}/status`, { method: 'POST' });
}
