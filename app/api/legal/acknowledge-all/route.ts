import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

export const POST = (req: NextRequest) => proxyToBackend(req, '/legal/acknowledge-all', { method: 'POST' });
