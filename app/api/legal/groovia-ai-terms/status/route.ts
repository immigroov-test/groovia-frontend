import { NextRequest } from 'next/server';
import { proxyPublic } from '../../../../../lib/backend';

// Guest-allowed (forwards a bearer token when present, never requires one): a guest has
// no account yet, so their "already accepted" check is by session_id, not identity.
export function GET(req: NextRequest) {
  const qs = req.nextUrl.search;
  return proxyPublic(req, `/legal/groovia-ai-terms/status${qs}`);
}
