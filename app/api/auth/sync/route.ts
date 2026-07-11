import { NextRequest } from 'next/server';
import { proxyToBackend } from '../../../../lib/backend';

// Runs after login/signup: links a pre-approved mentor, backfills the profile
// name, and attaches guest bookings made with this email. Requires auth.
export const POST = (req: NextRequest) => proxyToBackend(req, '/auth/sync');
