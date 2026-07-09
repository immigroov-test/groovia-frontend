import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

export const GET = (req: NextRequest) => proxyToBackend(req, '/mentor/availability');
export const POST = (req: NextRequest) => proxyToBackend(req, '/mentor/availability');
