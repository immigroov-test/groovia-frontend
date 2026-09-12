import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../lib/backend';

// Public: log a click on a promoter's link. Called by the /r/<slug> landing route.
export async function POST(req: NextRequest) {
  return proxyPublic(req, '/referrals/click');
}
