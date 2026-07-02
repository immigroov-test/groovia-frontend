// OAuth + email-confirmation callback.
// Handles BOTH:
//   /auth/callback?code=...                      (PKCE — OAuth & newer email links)
//   /auth/callback?token_hash=...&type=signup    (older email links)
import { NextResponse, type NextRequest } from 'next/server';
import { type EmailOtpType, type SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '../../../lib/supabase/server';
import { backendBaseUrl } from '../../../lib/backend';

// Right after login, ask the backend to link a pre-approved mentor account (matched
// by email) so they get mentor access. Best-effort — never blocks the redirect.
async function syncAccount(supabase: SupabaseClient) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    await fetch(`${backendBaseUrl()}/auth/sync`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* best-effort */
  }
}

// Only allow same-origin relative paths — blocks open redirects like //evil.com.
function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return '/chat';
  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = safeNext(searchParams.get('next'));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) { await syncAccount(supabase); return NextResponse.redirect(`${origin}${next}`); }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) { await syncAccount(supabase); return NextResponse.redirect(`${origin}${next}`); }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
