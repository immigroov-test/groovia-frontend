import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';

// No auth required: backs client-side reads of publicly-flagged documents (e.g. the
// Groovia AI Terms gate modal, which a signed-out guest must be able to read).
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return proxyPublic(req, `/legal/public/${encodeURIComponent(slug)}`);
}
