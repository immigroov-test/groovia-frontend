'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

// Keeps tabs in sync. Supabase broadcasts auth changes across tabs of the same
// browser, so if the user signs out in one tab, the others leave any gated page and
// re-render as logged-out. Also reconciles the account once per sign-in (backfill
// name, link guest bookings, link a pre-approved mentor) so password logins get the
// same treatment as the magic-link callback path.
export function AuthStateSync() {
  const router = useRouter();
  const syncedFor = useRef<string | null>(null);
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        syncedFor.current = null;
        router.replace('/home');
        router.refresh();
        return;
      }
      if (event === 'SIGNED_IN' && session?.user && syncedFor.current !== session.user.id) {
        syncedFor.current = session.user.id;
        const fullName = session.user.user_metadata?.full_name as string | undefined;
        fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify(fullName ? { full_name: fullName } : {}),
        }).then(() => router.refresh()).catch(() => {});
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);
  return null;
}
