'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
 *  Small and corner-anchored, always - never a gate. Explicit acceptance already
 *  happens at the checkbox moments (signup, checkout, mentor onboarding, the Groovia
 *  AI Terms modal); this notice just tells an already-bound user something changed
 *  and links straight to it, with a one-click bundled review at /legal/updates when
 *  more than one document is pending - see LegalUpdatesReview.
 *
 *  The check runs client-side after mount so it never sits in the critical path of a
 *  page render, and re-runs on navigation so acknowledging clears it without a reload. */
export function LegalUpdateNotice({ authed }: { authed: boolean }) {
  const [pending, setPending] = useState<PendingUpdate[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
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

  if (!authed) return null;

  // Every pending update gets the same small, dismissible corner notice. Continuing to
  // use the product is never blocked here: the checkbox gates at signup, checkout,
  // mentor onboarding and the Groovia AI Terms modal are where explicit acceptance is
  // actually required and recorded. This notice just tells an already-bound user what
  // changed, with a direct link to read it.
  const shown = pending.filter((p) => !hidden.includes(p.version_id));
  if (shown.length === 0) return null;

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
          <p className="text-sm font-semibold text-brand-900">We&rsquo;ve updated our {first.title}</p>
          <p className="text-sm text-muted mt-0.5">
            {others === 0
              ? <>Read the <Link href={`/privacy#${first.slug}`} className="text-brand-700 underline hover:text-brand-900">latest version</Link>.</>
              : <>Along with {others} other document{others === 1 ? '' : 's'}. <Link href="/legal/updates" className="text-brand-700 underline hover:text-brand-900">Read what changed</Link>.</>}
          </p>
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
