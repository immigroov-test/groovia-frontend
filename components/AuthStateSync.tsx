'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase/client';

// Keeps tabs in sync. Supabase broadcasts auth changes across tabs of the same
// browser, so if the user signs out in one tab, the others leave any gated page and
// re-render as logged-out.
export function AuthStateSync() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.replace('/chat');
        router.refresh();
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);
  return null;
}
