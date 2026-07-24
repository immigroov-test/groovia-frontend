// BFF proxy: the logged-in mentor's payout bank details. GET returns a masked view; POST
// adds/updates them. Full account numbers are never returned here (reveal is admin-only).
import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

export const GET = (req: NextRequest) => proxyToBackend(req, '/mentor/bank');
export const POST = (req: NextRequest) => proxyToBackend(req, '/mentor/bank', { method: 'POST' });
