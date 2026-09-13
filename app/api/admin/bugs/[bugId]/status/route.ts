import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../lib/backend';

// BUG-162: move one board item between columns.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ bugId: string }> },
) {
  const { bugId } = await params;
  return proxyToBackend(req, `/admin/bugs/${encodeURIComponent(bugId)}/status`);
}
