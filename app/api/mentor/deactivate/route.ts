import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// FEAT-020: hide the mentor's own profile. Body { delete: boolean } - false pauses it
// indefinitely, true also starts the 90-day clock after which the personal fields are scrubbed.
export const POST = (req: NextRequest) => proxyToBackend(req, '/mentor/me/deactivate');
