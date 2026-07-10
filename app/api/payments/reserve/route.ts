import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

// Consume a binding price quote into a 10-min payment-hold booking. Guest-allowed;
// forwards the bearer token when present so the hold links to a signed-in candidate.
export const POST = (req: NextRequest) => proxyPublic(req, '/payments/reserve');
