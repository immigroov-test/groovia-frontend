import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';

// Create a Razorpay order for a reserved booking. Returns order_id + key_id for
// the browser Checkout. Guest-allowed.
export const POST = (req: NextRequest) => proxyPublic(req, '/payments/razorpay/create-order');
