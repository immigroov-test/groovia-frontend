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
  is_major: boolean;
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
  const [dismissed, setDismissed] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiFetch<PendingUpdate[]>('/api/legal/pending');
      if (!cancelled && ok && Array.isArray(data)) setPending(data);
    })();
    return () => { cancelled = true; };
  }, [authed, pathname]);

  // Never stack the notice on top of the review page itself.
  if (pathname === '/legal/updates') return null;

  // MATERIAL revisions only. An editorial fix is not worth interrupting anyone for, and
  // prompting on every republish is how people learn to ignore the prompt that matters.
  const major = pending.filter((p) => p.is_major);

  // Not on the legal pages themselves: telling someone the terms changed while they are
  // reading the terms is noise.
  const readingLegal = pathname.startsWith('/legal') || pathname === '/privacy';

  if (!authed || major.length === 0 || readingLegal) return null;
  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border
                 border-[--color-border] bg-card p-4 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.25)]"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50">
          <FileText className="h-4 w-4 text-brand-700" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand-900">We&apos;ve updated our terms</p>
          <p className="mt-0.5 text-sm text-muted">
            <Link href="/privacy" className="text-brand-700 underline underline-offset-2 hover:text-brand-900">
              Read what changed
            </Link>
          </p>
          {/* No accept button. Acceptance is the checkbox at sign-in, which is asked every
              time, so a second place to agree would record the same consent twice under two
              different methods and muddy the audit trail. This only tells people. */}
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => setDismissed(true)}
          className="-mr-1 -mt-1 rounded-full p-1.5 text-muted hover:bg-brand-50 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
