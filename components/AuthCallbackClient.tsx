'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, MailWarning } from 'lucide-react';
import Link from 'next/link';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '../lib/supabase/client';
import { Card, CardBody } from './ui/Card';
import { Button } from './ui/Button';

// BUG-066: this used to be a server-side GET route handler (app/auth/callback/route.ts) that
// exchanged the single-use PKCE code the moment the URL was requested. Outlook's Safe Links (and
// similar corporate link-scanners in Gmail/O365) pre-fetch every URL in an email server-side BEFORE
// the user ever clicks it, to scan for malware - that GET consumed the one-time code, so by the time
// the real click happened the link was already used and exchangeCodeForSession failed with "This
// sign-in link didn't work". Scanners fetch the HTML but don't run JS, so doing the exchange here in
// a useEffect (client-side only, on real user page-loads) is immune to that prefetch.
export function AuthCallbackClient({
  code, tokenHash, type, next,
}: {
  code: string | null;
  tokenHash: string | null;
  type: string | null;
  next: string;
}) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;   // effects can double-fire in dev / StrictMode; the code is single-use
    ran.current = true;
    (async () => {
      const supabase = createClient();
      const { error } = code
        ? await supabase.auth.exchangeCodeForSession(code)
        : tokenHash && type
          ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType })
          : { error: new Error('Missing code') };
      if (error) { setFailed(true); return; }
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            signal: AbortSignal.timeout(4000),
          });
        }
      } catch { /* best-effort, never blocks sign-in */ }
      router.replace(next);
    })();
  }, [code, tokenHash, type, next, router]);

  if (failed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="max-w-md w-full">
          <CardBody className="pt-8 pb-7 text-center flex flex-col gap-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700">
              <MailWarning className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-semibold text-brand-900">This sign-in link didn&apos;t work</h1>
            <p className="text-sm text-muted leading-relaxed">
              The link may have expired, already been used, or been opened in a different
              browser than the one you requested it from. Request a fresh link and open it
              in the same browser.
            </p>
            <div className="flex flex-col gap-2 mt-3">
              <Link href="/home?auth=open"><Button className="w-full">Request a new link</Button></Link>
              <Link href="/home"><Button variant="ghost" className="w-full">Back to home</Button></Link>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex items-center gap-2 text-sm text-muted">
        <Loader2 className="h-4 w-4 animate-spin" /> Signing you in…
      </div>
    </div>
  );
}
