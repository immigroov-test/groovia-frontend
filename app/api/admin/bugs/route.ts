import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// BUG-162: the Immigroov bug board, read through the backend (which owns the board's credentials -
// they are never exposed to the browser).
export const GET = (req: NextRequest) =>
  proxyToBackend(req, `/admin/bugs${req.nextUrl.search}`);
