import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../lib/backend';

// Mentor activates/deactivates one of their codes.
export async function POST(req: NextRequest, { params }: { params: Promise<{ codeId: string }> }) {
  const { codeId } = await params;
  return proxyToBackend(req, `/referrals/codes/${codeId}/active`);
}
