'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { LegalMarkdown, legalHeadings } from './LegalMarkdown';
import { documentsForRegion } from '../lib/legal';

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

// Terms & Policies: a two-pane document browser, not a stack of collapsibles.
//
// The earlier version nested a disclosure inside a disclosure inside a disclosure. Every
// level added a border, so the page read as boxes within boxes, and two thirds of the set
// was hidden behind clicks at any moment.
//
// A side panel is the pattern this content calls for. Accordions suit short, independent
// answers; these are long cross-referencing contracts that a reader scans for one clause,
// and guidance on the pattern says as much - for terms and conditions specifically, use a
// side panel rather than an accordion. Stripe's legal hub works the same way: an index,
// and one document in view at a time.
//
// So: every document listed at once on the left, exactly one rendered on the right, with
// its own contents. Nothing is hidden, nothing is nested, and the list is plainly
// navigation rather than a row of mystery boxes. On a phone the same list becomes a native
// grouped select, which is accessible for free and needs no custom menu.
export function PublicLegalPage(
  { docs, openSlug, country }:
  { docs: PublicLegalDocument[]; openSlug?: string; country?: string | null },
) {
  const [query, setQuery] = useState('');

  // Two of the fourteen are region-specific: the India Customer T&C and the Rest-of-World
  // one. Listing both and leaving the reader to work out which binds them is the one thing
  // a terms page must not do, so only the applicable edition appears. Region comes from the
  // same edge geo the pricing uses; unknown geo falls back to Rest of World, the wider set.
  const applicable = useMemo(() => documentsForRegion(docs, country), [docs, country]);

  const [active, setActive] = useState<string>(() => openSlug || '');

  // The hash is the source of truth for which document is open, so a link, the back button
  // and a shared URL all behave the same way.
  //
  // It carries two kinds of target. /privacy#privacy-policy names a DOCUMENT, and those
  // links are already in the footer, the sign-in modal and the booking widget. A contents
  // link writes a HEADING id instead. Both have to work, so an id that is not a document is
  // matched against the headings of every document: that opens the right one and then
  // scrolls, which is what makes a shared link to a single clause land where it should.
  useEffect(() => {
    const applyHash = () => {
      const id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
      if (!id) return;
      if (applicable.some((d) => d.slug === id)) { setActive(id); return; }
      const owner = applicable.find((d) => legalHeadings(d.content).some((h) => h.id === id));
      if (!owner) return;
      setActive(owner.slug);
      requestAnimationFrame(() =>
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, [applicable]);

  // Fall back to the first applicable document rather than an empty pane.
  const current = applicable.find((d) => d.slug === active) ?? applicable[0];

  const select = useCallback((slug: string) => {
    setActive(slug);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${slug}`);
      // Only pull the viewport on a narrow screen, where the content sits BELOW the list.
      // On desktop the pane is already beside the list and scrolling would be disorienting.
      if (window.matchMedia('(max-width: 767px)').matches) {
        requestAnimationFrame(() =>
          document.getElementById('legal-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    }
  }, []);

  // Searching the BODY, not the titles. Someone looking for "cancellation window" or "data
  // retention" cannot know which contract holds it, and a list of titles is exactly what
  // fails to tell them.
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

  const headings = current ? legalHeadings(current.content) : [];

  if (applicable.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Terms &amp; Policies</h1>
        <p className="text-sm text-muted mt-3">Nothing has been published yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Terms &amp; Policies</h1>
      <p className="text-sm text-muted mt-2 max-w-2xl">
        Everything that governs your use of Immigroov. Each document shows its version and the
        date it was last updated.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[15rem_1fr] lg:grid-cols-[17rem_1fr]">
        {/* ── Index ─────────────────────────────────────────────────────────────── */}
        <div className="md:sticky md:top-24 md:self-start">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all documents"
              aria-label="Search terms and policies"
              className="w-full rounded-full border border-[--color-border] bg-card py-2 pl-9 pr-9 text-sm
                         outline-none focus:border-brand-500"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {q && (
            <p className="mt-3 text-xs text-muted" role="status">
              {matches.length} of {applicable.length} documents mention this.
            </p>
          )}

          {/* Phone: the same index as a native grouped select. Cheaper to operate than a
              custom menu, and it comes with keyboard and screen-reader behaviour built in. */}
          <div className="md:hidden mt-4">
            <label htmlFor="legal-picker" className="sr-only">Choose a document</label>
            <select
              id="legal-picker"
              value={current?.slug ?? ''}
              onChange={(e) => select(e.target.value)}
              className="w-full rounded-xl border border-[--color-border] bg-card px-3 py-2.5 text-sm outline-none focus:border-brand-500"
            >
              {groups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((d) => <option key={d.slug} value={d.slug}>{d.title}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Desktop: the whole set visible at once, grouped by who it binds. */}
          <nav className="hidden md:block mt-5" aria-label="Terms and policies">
            {groups.map((g) => (
              <div key={g.label} className="mb-5 last:mb-0">
                <p className="px-3 text-[0.7rem] font-semibold uppercase tracking-wide text-muted/70">{g.label}</p>
                <ul className="mt-1.5 flex flex-col gap-0.5">
                  {g.items.map((d) => {
                    const isActive = d.slug === current?.slug;
                    return (
                      <li key={d.slug}>
                        <button
                          type="button"
                          onClick={() => select(d.slug)}
                          aria-current={isActive ? 'true' : undefined}
                          className={cn(
                            'w-full text-left rounded-lg px-3 py-2 text-sm transition-colors',
                            isActive
                              ? 'bg-brand-50 text-brand-900 font-medium'
                              : 'text-muted hover:bg-brand-50/60 hover:text-foreground',
                          )}
                        >
                          {d.title}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {matches.length === 0 && (
              <p className="px-3 text-sm text-muted">
                Nothing matches.{' '}
                <button type="button" onClick={() => setQuery('')} className="text-brand-700 hover:underline">Clear</button>
              </p>
            )}
          </nav>
        </div>

        {/* ── Document ──────────────────────────────────────────────────────────── */}
        <article id="legal-content" className="min-w-0 scroll-mt-24">
          {current && (
            <>
              <h2 className="text-xl font-semibold tracking-tight text-brand-900">{current.title}</h2>
              {current.summary && <p className="text-sm text-muted mt-1">{current.summary}</p>}
              <p className="text-xs text-muted/80 mt-2 tabular-nums">
                {current.version} · Last updated {when(current.last_updated)}
              </p>

              {/* Contents, for the documents long enough that finding a clause by scrolling
                  is the actual difficulty. Styled as links, because the previous version
                  gave no sign these were clickable. */}
              {headings.length >= 4 && (
                <nav aria-label={`Contents of ${current.title}`}
                  className="mt-5 rounded-xl border border-[--color-border] bg-brand-50/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted/70">On this page</p>
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {headings.map((h) => (
                      <li key={h.id}>
                        <a href={`#${h.id}`} className="text-sm text-brand-700 underline underline-offset-2 hover:text-brand-900">
                          {h.text}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>
              )}

              <div className="mt-6">
                <LegalMarkdown content={current.content} />
              </div>
            </>
          )}

          <p className="mt-10 pt-6 border-t border-[--color-border] text-sm text-muted">
            Questions about your data?{' '}
            <Link href="/legal/data-subject-request" className="text-brand-700 hover:underline">
              Make a data request
            </Link>
            .
          </p>
        </article>
      </div>
    </div>
  );
}
