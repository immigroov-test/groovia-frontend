import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

// Webhook-independent verify — the browser calls this right after Checkout
// succeeds, in case the webhook is delayed. Guest-allowed.
export const POST = (req: NextRequest) => proxyPublic(req, '/payments/verify');
