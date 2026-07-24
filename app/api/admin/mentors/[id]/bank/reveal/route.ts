// BFF proxy: admin reveals a mentor's full payout details (decrypted server-side) to pay them.
import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../../lib/backend';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyToBackend(req, `/admin/mentors/${id}/bank/reveal`, { method: 'POST' });
}
