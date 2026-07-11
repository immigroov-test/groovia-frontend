import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// Toggle the mentor's smart (PPP) pricing. Applied live.
export const POST = (req: NextRequest) => proxyToBackend(req, '/mentor/smart-pricing');
