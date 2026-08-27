import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';

export const POST = (req: NextRequest) => proxyPublic(req, '/legal/groovia-ai-terms/accept', { method: 'POST' });
