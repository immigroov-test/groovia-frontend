import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

// Confirms a payment hold directly when real payments are disabled
// (payments_enabled=false). Rejected by the backend once payments are live.
export const POST = (req: NextRequest) => proxyPublic(req, '/payments/confirm-mock');
