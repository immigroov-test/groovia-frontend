import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

export const GET = (req: NextRequest) => proxyToBackend(req, '/legal/pending');
