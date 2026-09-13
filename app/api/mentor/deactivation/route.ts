import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// FEAT-020: which self-service state the mentor's profile is in, when the deletion grace window
// runs out, and how many booked sessions they are still expected to attend.
export const GET = (req: NextRequest) => proxyToBackend(req, '/mentor/me/deactivation');
