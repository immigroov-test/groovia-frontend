import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// FEAT-020: restore a profile the mentor hid themselves.
export const POST = (req: NextRequest) => proxyToBackend(req, '/mentor/me/reactivate');
