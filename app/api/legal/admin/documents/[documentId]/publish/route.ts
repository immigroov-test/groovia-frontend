import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../../lib/backend';

export async function POST(req: NextRequest, { params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  return proxyToBackend(req, `/legal/admin/documents/${documentId}/publish`, { method: 'POST' });
}
