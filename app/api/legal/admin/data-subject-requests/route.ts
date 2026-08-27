import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

export function GET(req: NextRequest) {
  const qs = req.nextUrl.search;
  return proxyToBackend(req, `/legal/admin/data-subject-requests${qs}`);
}
