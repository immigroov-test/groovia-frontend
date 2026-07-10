import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// Admin-only: mentor payouts (optional ?state= filter, forwarded through).
export const GET = (req: NextRequest) => proxyToBackend(req, `/admin/payouts${req.nextUrl.search}`);
