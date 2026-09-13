import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../../lib/backend';

// Admin: record one of the three review decisions on a flag.
export async function POST(req: NextRequest, { params }: { params: Promise<{ flagId: string }> }) {
  const { flagId } = await params;
  return proxyToBackend(req, `/referrals/admin/flags/${flagId}`);
}
