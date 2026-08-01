import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../../lib/backend';

// Admin: referred bookings (who gave the code, customer, service, discount, split, amount).
// Forwards an optional ?affiliate_id= filter.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, `/referrals/admin/bookings${req.nextUrl.search}`);
}
