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
  region_scope?: string | null;   // 'all' | 'in' | 'row'
  version: string;
  last_updated: string;
  content: string;
}

function when(ts: string): string {
  return new Date(ts).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

// Terms & Policies: every published document, grouped by who it binds.
//
// One page rather than fourteen URLs. These documents cross-reference each other
// constantly ("as described in the Refund & Cancellation Policy", "read together with the
// Groovia AI Terms"), and following those across separate pages means losing your place
// every time.
//
// Two levels of disclosure, because fourteen contracts in a flat list is not a structure,
// it is an inventory. The three groups answer "which of these are about me" first, and
// only then does a reader open the one document they came for.
export function PublicLegalPage(
  { docs, openSlug, country }:
  { docs: PublicLegalDocument[]; openSlug?: string; country?: string | null },
) {
  const [openDocs, setOpenDocs] = useState<Set<string>>(() => new Set(openSlug ? [openSlug] : []));
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState('');

  // Two of the fourteen are region-specific: the India Customer T&C and the Rest-of-World
  // one. Showing both and leaving the reader to work out which binds them is the single
  // thing a terms page must not do, so only the applicable edition is listed. Region comes
  // from the same edge geo the pricing uses; unknown geo falls back to Rest of World,
  // which is the wider audience.
  const inIndia = (country || '').toUpperCase() === 'IN';
  const applicable = useMemo(
    () => docs.filter((d) => {
      const scope = (d.region_scope || 'all').toLowerCase();
      if (scope === 'in') return inIndia;
      if (scope === 'row') return !inIndia;
      return true;
    }),
    [docs, inIndia],
  );

  // Searching the BODY, not the titles. Someone looking for "cancellation window" or
  // "data retention" cannot know which contract holds it, and a list of titles is exactly
  // what fails to tell them.
  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!q) return applicable;
    return applicable.filter((d) =>
      d.title.toLowerCase().includes(q)
      || (d.summary ?? '').toLowerCase().includes(q)
      || d.content.toLowerCase().includes(q));
  }, [applicable, q]);

  const groups = useMemo(() => {
    const out: { label: string; items: PublicLegalDocument[] }[] = [];
    for (const d of matches) {
      const g = out.find((x) => x.label === d.audience_label);
      if (g) g.items.push(d);
      else out.push({ label: d.audience_label, items: [d] });
    }
    return out;
  }, [matches]);

  // A link that lands on a CLOSED section has not taken the reader anywhere. The hash has
  // to open the document AND the group holding it, or the anchor scrolls to something that
  // is not on screen yet.
  useEffect(() => {
    const applyHash = () => {
      const slug = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      const doc = docs.find((d) => d.slug === slug);
      if (!doc) return;
      setOpenGroups((cur) => new Set(cur).add(doc.audience_label));
      setOpenDocs((cur) => new Set(cur).add(slug));
      requestAnimationFrame(() =>
        document.getElementById(slug)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [docs]);

  // While searching, the groups holding a hit open themselves. Reporting "3 documents
  // mention this" and then hiding all three behind a collapsed group would be worse than
  // not searching at all.
  useEffect(() => {
    if (!q) return;
    setOpenGroups(new Set(groups.map((g) => g.label)));
  }, [q, groups]);

  const toggleDoc = useCallback((slug: string) => {
    setOpenDocs((cur) => {
      const next = new Set(cur);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', next.has(slug) ? `#${slug}` : window.location.pathname);
      }
      return next;
    });
  }, []);

  const toggleGroup = useCallback((label: string) => {
    setOpenGroups((cur) => {
      const next = new Set(cur);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }, []);

  const allOpen = matches.length > 0 && matches.every((d) => openDocs.has(d.slug));

  function expandAll() {
    if (allOpen) {
      setOpenDocs(new Set());
      setOpenGroups(new Set());
      return;
    }
    setOpenDocs(new Set(matches.map((d) => d.slug)));
    setOpenGroups(new Set(groups.map((g) => g.label)));
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Terms &amp; Policies</h1>
      <p className="text-sm text-muted mt-2">
        Everything that governs your use of Immigroov. Each document shows its version and the
        date it was last updated.
      </p>

      {applicable.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all documents, e.g. refunds, data retention"
              aria-label="Search terms and policies"
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
            onClick={expandAll}
            className="shrink-0 rounded-full border border-[--color-border] px-4 py-2 text-sm text-muted
                       hover:text-foreground hover:bg-brand-50/50 transition-colors"
          >
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>
      )}

      {applicable.length === 0 && (
        <p className="text-sm text-muted mt-8">No documents have been published yet.</p>
      )}

      {applicable.length > 0 && matches.length === 0 && (
        <p className="text-sm text-muted mt-8">
          Nothing matches that search.{' '}
          <button type="button" onClick={() => setQuery('')} className="text-brand-700 hover:underline">
            Clear it
          </button>{' '}
          to see all {applicable.length} documents.
        </p>
      )}

      {q && matches.length > 0 && (
        <p className="text-xs text-muted mt-4" role="status">
          {matches.length} of {applicable.length} documents mention this.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {groups.map(({ label, items }) => {
          const groupOpen = openGroups.has(label);
          return (
            <section key={label} className="rounded-2xl border border-[--color-border] bg-card overflow-hidden">
              <button
                type="button"
                onClick={() => toggleGroup(label)}
                aria-expanded={groupOpen}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-brand-50/50 transition-colors"
              >
                <span>
                  <span className="block font-medium text-brand-900">{label}</span>
                  <span className="block text-xs text-muted mt-0.5">
                    {items.length} document{items.length === 1 ? '' : 's'}
                  </span>
                </span>
                <ChevronDown className={cn('h-5 w-5 text-muted shrink-0 transition-transform', groupOpen && 'rotate-180')} />
              </button>

              {groupOpen && (
                <div className="px-3 pb-3 sm:px-4 sm:pb-4 flex flex-col gap-2 border-t border-[--color-border] pt-3">
                  {items.map((d) => {
                    const isOpen = openDocs.has(d.slug);
                    const headings = isOpen ? legalHeadings(d.content) : [];
                    return (
                      <div key={d.document_id} id={d.slug}
                        className="rounded-xl border border-[--color-border] bg-background/40 overflow-hidden scroll-mt-24">
                        <button
                          type="button"
                          onClick={() => toggleDoc(d.slug)}
                          aria-expanded={isOpen}
                          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-brand-50/50 transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-brand-900">{d.title}</span>
                            {d.summary && <span className="block text-xs text-muted mt-0.5">{d.summary}</span>}
                            <span className="block text-xs text-muted/80 mt-0.5 tabular-nums">
                              {d.version} · Last updated {when(d.last_updated)}
                            </span>
                          </span>
                          <ChevronDown className={cn('h-4 w-4 text-muted shrink-0 transition-transform', isOpen && 'rotate-180')} />
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-5 pt-1 border-t border-[--color-border]">
                            {/* Contents, for the documents long enough that finding a clause
                                by scrolling is the actual difficulty. */}
                            {headings.length >= 4 && (
                              <nav aria-label={`Contents of ${d.title}`}
                                className="my-4 rounded-lg border border-[--color-border] bg-brand-50/40 px-3 py-2.5">
                                <p className="text-xs font-medium text-brand-900">On this page</p>
                                <ul className="mt-1.5 flex flex-col gap-1">
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
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-10 pt-6 border-t border-[--color-border] text-sm text-muted">
        Questions about your data?{' '}
        <Link href="/legal/data-subject-request" className="text-brand-700 hover:underline">
          Submit a data request
        </Link>
        .
      </p>
    </div>
  );
}
