'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FileText, X } from 'lucide-react';
import { apiFetch } from '../lib/api';

interface PendingUpdate {
  document_id: string;
  slug: string;
  title: string;
  version_id: string;
  version: string;
  last_updated: string;
}

// Dismissing hides the notice for THIS browser session only. It is deliberately not
// persistent: the record that matters is the acknowledgement, and someone who closes
// the notice has not agreed to anything, so it should come back next time they sign
// in. Acknowledging is what removes it for good - that drops every acknowledged
// document out of /legal/pending entirely.
const DISMISSED_KEY = 'ig_legal_notice_dismissed';

function readDismissed(): string[] {
  try { return JSON.parse(sessionStorage.getItem(DISMISSED_KEY) || '[]') as string[]; }
  catch { return []; }
}
function dismiss(versionIds: string[]) {
  try {
    const next = Array.from(new Set([...readDismissed(), ...versionIds]));
    sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  } catch { /* private mode - the notice simply reappears on navigation */ }
}

/** "Legal document updated" — shown after sign-in when one or more documents that
 *  apply to this user have a newer version than the one they acknowledged.
 *
 *  Small and corner-anchored rather than a modal: this is a prompt to review, not a
 *  gate. Blocking the product behind it would punish people for a change they did
 *  not make, and an interstitial is exactly the pattern users dismiss without reading.
 *
 *  However many documents are pending, Review leads to ONE page (/legal/updates)
 *  with ONE acknowledgement covering all of them - see LegalUpdatesReview. A customer
 *  should never be asked to click through nine separate documents one at a time.
 *
 *  The check runs client-side after mount so it never sits in the critical path of a
 *  page render, and re-runs on navigation so acknowledging clears it without a reload. */
export function LegalUpdateNotice({ authed }: { authed: boolean }) {
  const [pending, setPending] = useState<PendingUpdate[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!authed) { setPending([]); return; }
    let cancelled = false;
    setHidden(readDismissed());
    (async () => {
      const { ok, data } = await apiFetch<PendingUpdate[]>('/api/legal/pending');
      if (!cancelled && ok && Array.isArray(data)) setPending(data);
    })();
    return () => { cancelled = true; };
  }, [authed, pathname]);

  // Never stack the notice on top of the review page itself.
  if (pathname === '/legal/updates') return null;

  const shown = pending.filter((p) => !hidden.includes(p.version_id));
  if (!authed || shown.length === 0) return null;

  const first = shown[0];
  const others = shown.length - 1;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-[--color-border]
                 bg-card p-4 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.25)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50">
          <FileText className="h-4 w-4 text-brand-700" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-900">Legal document updated</p>
          <p className="text-sm text-muted mt-0.5">
            {others === 0
              ? <>{first.title} has been updated. Please review the latest version.</>
              : <>{first.title} and {others} other document{others === 1 ? '' : 's'} {others === 1 ? 'has' : 'have'} been updated. Please review the latest versions.</>}
          </p>
          <button
            type="button"
            onClick={() => router.push('/legal/updates')}
            className="mt-2.5 inline-flex h-9 items-center rounded-full bg-brand-900 px-4 text-sm font-medium
                       text-white hover:bg-[#2a2e39] active:scale-[0.98] transition-colors"
          >
            Review
          </button>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => { const ids = shown.map((p) => p.version_id); dismiss(ids); setHidden((h) => [...h, ...ids]); }}
          className="-mr-1 -mt-1 rounded-full p-1.5 text-muted hover:bg-brand-50 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
