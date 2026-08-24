import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../lib/backend';

export async function GET(req: NextRequest, { params }: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await params;
  return proxyToBackend(req, `/legal/admin/versions/${versionId}`);
}
