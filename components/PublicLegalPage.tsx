'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { LegalMarkdown, legalHeadings } from './LegalMarkdown';

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
// Sections start closed. Fourteen contracts expanded at once is a wall of text nobody
// reads; a list of titles is something a person can actually navigate. Each section
// carries its slug as an id, so /privacy#privacy-policy opens that document directly.
//
// The prose styling is built on the premise that people SCAN these for the clause that
// affects them. Good leading alone does not make that possible, so this page also
// searches the full text of all fourteen, and each document long enough to need one
// carries a contents list linking to its own clauses.
export function PublicLegalPage({ docs, openSlug }: { docs: PublicLegalDocument[]; openSlug?: string }) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(openSlug ? [openSlug] : []));
  const [query, setQuery] = useState('');

  // A link that lands on a CLOSED section has not taken the reader anywhere: the browser
  // scrolls the title bar into view and the document they came to read is still hidden
  // behind a click. So the hash opens its section as well as scrolling to it, and it is
  // re-applied on hashchange, because following /privacy#refund-cancellation-policy from
  // a page that is already /privacy fires no navigation, only a hash change.
  useEffect(() => {
    const applyHash = () => {
      const slug = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!slug || !docs.some((d) => d.slug === slug)) return;
      setOpen((cur) => new Set(cur).add(slug));
      requestAnimationFrame(() =>
        document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [docs]);

  // Opening a section puts its slug in the URL so the reader can share or bookmark the
  // exact document. replaceState rather than assigning location.hash: assigning would
  // fire the listener above and fight the click that just ran.
  const toggle = useCallback((slug: string) => {
    setOpen((cur) => {
      const next = new Set(cur);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', next.has(slug) ? `#${slug}` : window.location.pathname);
      }
      return next;
    });
  }, []);

  // Searching the BODY, not just the titles. Someone looking for "cancellation window" or
  // "data retention" has no way to know which of fourteen contracts it lives in, and that
  // is exactly what a list of titles fails to answer.
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return docs;
    return docs.filter((d) =>
      d.title.toLowerCase().includes(q)
      || (d.summary ?? '').toLowerCase().includes(q)
      || d.content.toLowerCase().includes(q));
  }, [docs, q]);

  const groups = matches.reduce<Record<string, PublicLegalDocument[]>>((acc, d) => {
    (acc[d.audience_label] ??= []).push(d);
    return acc;
  }, {});

  const allOpen = matches.length > 0 && matches.every((d) => open.has(d.slug));

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Legal Documents</h1>
      <p className="text-sm text-muted mt-2">
        Everything that governs your use of Immigroov, including our Privacy Policy and Terms of Use.
        Each document shows the version and date it was last updated.
      </p>

      {docs.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all documents, e.g. refunds, data retention"
              aria-label="Search legal documents"
              className="w-full rounded-full border border-[--color-border] bg-card py-2.5 pl-9 pr-9 text-sm
                         outline-none focus:border-brand-500"
            />
            {query && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(allOpen ? new Set() : new Set(matches.map((d) => d.slug)))}
            className="shrink-0 rounded-full border border-[--color-border] px-4 py-2 text-sm text-muted
                       hover:text-foreground hover:bg-brand-50/50 transition-colors"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      )}

      {docs.length === 0 && (
        <p className="text-sm text-muted mt-8">No legal documents have been published yet.</p>
      )}

      {docs.length > 0 && matches.length === 0 && (
        <p className="text-sm text-muted mt-8">
          Nothing matches that search.{' '}
          <button type="button" onClick={() => setQuery('')} className="text-brand-700 hover:underline">
            Clear it
          </button>{' '}
          to see all {docs.length} documents.
        </p>
      )}

      {q && matches.length > 0 && (
        <p className="text-xs text-muted mt-4" role="status">
          {matches.length} of {docs.length} documents mention this.
        </p>
      )}

      {Object.entries(groups).map(([label, items]) => (
        <section key={label} className="mt-8">
          {/* The audience heading is information, not a gate: anyone may read the mentor
              contracts. It tells a reader which of the fourteen actually bind them. */}
          <h2 className="text-sm font-medium text-muted">{label}</h2>
          <div className="mt-3 flex flex-col gap-2">
            {items.map((d) => {
              const isOpen = open.has(d.slug);
              const headings = isOpen ? legalHeadings(d.content) : [];
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
                      {/* Contents, for the documents long enough that finding a clause by
                          scrolling is the actual difficulty. Under four sections it is noise. */}
                      {headings.length >= 4 && (
                        <nav aria-label={`Contents of ${d.title}`}
                          className="mb-5 rounded-xl border border-[--color-border] bg-brand-50/40 px-4 py-3">
                          <p className="text-xs font-medium text-brand-900">On this page</p>
                          <ul className="mt-2 flex flex-col gap-1.5">
                            {headings.map((h) => (
                              <li key={h.id}>
                                <a href={`#${h.id}`} className="text-xs text-muted hover:text-brand-700 hover:underline">
                                  {h.text}
                                </a>
                              </li>
                            ))}
                          </ul>
                        </nav>
                      )}
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
