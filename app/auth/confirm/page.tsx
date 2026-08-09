'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '../../../lib/supabase/client';
import { Button } from '../../../components/ui/Button';

// BUG-066: sign-in / activation links failed for Outlook (and other corporate inboxes) because their
// link scanners (Microsoft SafeLinks / Defender) pre-fetch every URL in an email. Supabase's default
// confirmation link verifies the one-time token on that GET, so the scanner consumed it and the user's
// real click hit an already-used link ("the sign in link did not work").
//
// This page fixes it by only verifying on an explicit BUTTON CLICK. A passive scanner GET just renders
// the page and never touches the token, so it stays valid for the real user. The email template links
// here with the raw token_hash instead of the auto-verifying URL (see the note in the PR / setup doc).
function ConfirmInner() {
  const params = useSearchParams();
  const router = useRouter();
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  const rawNext = params.get('next');
  const next = rawNext && rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/home';

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    if (!tokenHash || !type) {
      setError('This link is missing its verification code. Please request a new email.');
      return;
    }
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (err) {
      // The token may have been consumed elsewhere (a second tab, or a link scanner) while a valid
      // session was still established. Only fail when there is genuinely no session (BUG-066).
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('This link has expired or was already used. Please head back and request a new sign-in email.');
        setBusy(false);
        return;
      }
    }
    // Session is set client-side now; AuthStateSync links a pre-approved mentor + guest bookings.
    router.replace(next);
  }

  return (
    <div className="mx-auto max-w-md px-4 sm:px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Confirm your sign-in</h1>
      <p className="mt-2 text-sm text-muted leading-relaxed">
        One quick step for your security, tap the button below to finish signing in to Immigroov.
      </p>
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      <Button variant="accent" className="mt-6 w-full" loading={busy} onClick={confirm} disabled={!tokenHash}>
        Confirm and continue
      </Button>
      <p className="mt-4 text-xs text-muted">Didn&apos;t request this? You can safely ignore this page.</p>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmInner />
    </Suspense>
  );
}
