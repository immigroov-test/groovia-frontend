'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FileText } from 'lucide-react';
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
  const router = useRouter();
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

  // A MATERIAL revision (major version bump) to terms someone is already bound by needs
  // their explicit acceptance, not a toast they can flick away: continuing to use the
  // product is not agreement, and a dismissible corner card is the pattern people close
  // without reading. Editorial revisions keep the unobtrusive notice - nagging someone
  // over a corrected typo trains them to ignore the real ones.
  //
  // Dismissal deliberately does not apply to material updates. It applies to the rest.
  // MATERIAL revisions only. An editorial fix is not worth interrupting anyone for, and
  // prompting on every republish is how people learn to dismiss the prompt that matters.
  // Dismissal deliberately does not apply here: this is not a notice, it is a gate.
  const major = pending.filter((p) => p.is_major);

  // Reading is never blocked. The legal pages and the public policy page stay reachable
  // so nobody is asked to accept something they are being prevented from opening, and
  // sign-out stays available from the nav underneath.
  const readingLegal = pathname.startsWith('/legal') || pathname === '/privacy';

  if (!authed) return null;

  if (major.length > 0 && !readingLegal) {
    const one = major.length === 1;
    return (
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="legal-gate-title"
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-brand-900/40 backdrop-blur-sm p-4"
      >
        <div className="w-full max-w-md rounded-2xl border border-[--color-border] bg-card p-6 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.35)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50">
            <FileText className="h-5 w-5 text-brand-700" />
          </span>
          <h2 id="legal-gate-title" className="mt-4 text-lg font-semibold text-brand-900">
            {one ? 'An agreement has changed' : 'Your agreements have changed'}
          </h2>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {one
              ? <>We have published a new version of the <strong className="text-foreground">{major[0].title}</strong>. Please read and accept it to continue.</>
              : <>We have published new versions of {major.length} documents that apply to your account, including the <strong className="text-foreground">{major[0].title}</strong>. Please read and accept them to continue.</>}
          </p>
          <button
            type="button"
            onClick={() => router.push('/legal/updates')}
            className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-full bg-brand-900 px-4
                       text-sm font-medium text-white hover:bg-[#2a2e39] active:scale-[0.98] transition-colors"
          >
            Review and accept
          </button>
        </div>
      </div>
    );
  }

  return null;
}
