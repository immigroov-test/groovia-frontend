import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// Admin-only: recent customer payments.
export const GET = (req: NextRequest) => proxyToBackend(req, '/admin/payments');
