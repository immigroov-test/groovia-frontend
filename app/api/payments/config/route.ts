import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

// Public — tells the frontend whether real Razorpay checkout is on or the
// mock-instant-confirm flow should be used.
export const GET = (req: NextRequest) => proxyPublic(req, '/payments/config');
