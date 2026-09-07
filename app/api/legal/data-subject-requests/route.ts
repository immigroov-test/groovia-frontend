import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

// Public: exercising your rights must not itself require an account.
export const POST = (req: NextRequest) => proxyPublic(req, '/legal/data-subject-requests', { method: 'POST' });
