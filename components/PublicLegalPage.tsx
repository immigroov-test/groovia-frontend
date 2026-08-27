'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { LegalMarkdown } from './LegalMarkdown';

export interface PublicLegalDocument {
  document_id: string;
  code: string;
  slug: string;
  title: string;
  summary: string | null;
  audience: string;
  audience_label: string;
  version: string;
  last_updated: string;
  content: string;
}

function when(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// The public legal page: every published document as a collapsible section.
//
// One page rather than fourteen URLs. These documents cross-reference each other
// constantly ("as described in the Refund & Cancellation Policy", "read together with
// the Groovia AI Terms"), and following those references across separate pages means
// losing your place every time. Here the next document is one click away in the same
// view.
//
// All sections start closed. Fourteen contracts expanded at once is a wall of text
// nobody reads; a list of titles is something a person can actually navigate. Each
// section carries its slug as an id, so /privacy#privacy-policy still scrolls a
// visitor to the document they came for.
//
// openSlug exists for a caller that wants one section already open. /privacy does not
// pass it - it renders with everything closed and lets the anchor do the work.
export function PublicLegalPage({ docs, openSlug }: { docs: PublicLegalDocument[]; openSlug?: string }) {
  const [open, setOpen] = useState<string | null>(openSlug ?? null);

  // A link that lands on a CLOSED section has not taken the reader anywhere: the browser
  // scrolls the title bar into view and the document they came to read is still hidden
  // behind a click. So the hash opens its section as well as scrolling to it, and it is
  // re-applied on hashchange - following /privacy#refund-cancellation-policy from a page
  // that is already /privacy fires no navigation, only a hash change.
  useEffect(() => {
    const applyHash = () => {
      const slug = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!slug || !docs.some((d) => d.slug === slug)) return;
      setOpen(slug);
      // Scroll only after the section has expanded, or we measure the collapsed height
      // and stop short of the content.
      requestAnimationFrame(() =>
        document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [docs]);

  // Opening a section puts its slug in the URL so the reader can share or bookmark the
  // exact document. replaceState rather than a hash assignment: setting location.hash
  // would fire the listener above and fight the click that just ran.
  const toggle = useCallback((slug: string) => {
    setOpen((cur) => {
      const next = cur === slug ? null : slug;
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', next ? `#${next}` : window.location.pathname);
      }
      return next;
    });
  }, []);

  const groups = docs.reduce<Record<string, PublicLegalDocument[]>>((acc, d) => {
    (acc[d.audience_label] ??= []).push(d);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Legal Documents</h1>
      <p className="text-sm text-muted mt-2">
        Everything that governs your use of Immigroov, including our Privacy Policy and Terms of Use.
        Each document shows the version and date it was last updated.
      </p>

      {docs.length === 0 && (
        <p className="text-sm text-muted mt-8">No legal documents have been published yet.</p>
      )}

      {Object.entries(groups).map(([label, items]) => (
        <section key={label} className="mt-8">
          {/* The audience heading is information, not a gate: anyone may read the mentor
              contracts. It tells a reader which of the fourteen actually bind them. */}
          <h2 className="text-sm font-medium text-muted">{label}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {items.map((d) => {
              const isOpen = open === d.slug;
              return (
                <div key={d.document_id} id={d.slug}
                  className="rounded-2xl border border-[--color-border] bg-card overflow-hidden scroll-mt-20">
                  <button
                    type="button"
                    onClick={() => toggle(d.slug)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-brand-50/50 transition-colors"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium text-brand-900">{d.title}</span>
                      <span className="block text-xs text-muted mt-0.5 tabular-nums">
                        {d.version} · Last updated {when(d.last_updated)}
                      </span>
                    </span>
                    <ChevronDown className={cn('h-5 w-5 text-muted shrink-0 transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-6 pt-1 border-t border-[--color-border]">
                      {d.summary && <p className="text-sm text-muted mt-3 mb-4">{d.summary}</p>}
                      <LegalMarkdown content={d.content} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <p className="mt-10 pt-6 border-t border-[--color-border] text-sm text-muted">
        Signed in?{' '}
        <Link href="/legal" className="text-brand-700 hover:underline">
          See which of these apply to your account
        </Link>
        .
      </p>
    </div>
  );
}
