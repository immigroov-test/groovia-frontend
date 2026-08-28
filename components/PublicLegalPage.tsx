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

// Terms & Policies: a document browser with a PDF-style outline.
//
// Not an accordion. These are long cross-referencing contracts a reader scans for one
// clause, and the pattern guidance for terms and conditions specifically is to use a side
// panel rather than stacked disclosures. Stripe's legal hub works the same way: an index,
// one document in view.
//
// The left column IS the outline: groups, then documents, then the sections of whichever
// document is open, exactly like the bookmarks pane of a PDF. Clicking a section jumps to
// it. Keeping the contents there rather than in a box above the text means the reader holds
// their place in the structure instead of scrolling past a list to reach the document.
export function PublicLegalPage(
  { docs, openSlug, country }:
  { docs: PublicLegalDocument[]; openSlug?: string; country?: string | null },
) {
  const [query, setQuery] = useState('');

  // Two of the fourteen are region-specific: the India Customer T&C and the Rest-of-World
  // one. Only the applicable edition is listed - the rule lives in lib/legal.ts.
  const applicable = useMemo(() => documentsForRegion(docs, country), [docs, country]);

  const [active, setActive] = useState<string>(() => openSlug || '');

  // The hash carries two kinds of target and both have to work. /privacy#privacy-policy
  // names a DOCUMENT, and those links are already in the footer, the sign-in modal and the
  // booking widget. An outline link writes a HEADING id instead. So an id that is not a
  // document is matched against the headings of every document: that opens the right one
  // and scrolls, which is what makes a shared link to a single clause land where it should.
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

  const current = applicable.find((d) => d.slug === active) ?? applicable[0];

  const select = useCallback((slug: string) => {
    setActive(slug);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${slug}`);
      // Only pull the viewport on a narrow screen, where the content sits BELOW the index.
      if (window.matchMedia('(max-width: 767px)').matches) {
        requestAnimationFrame(() =>
          document.getElementById('legal-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
    }
  }, []);

  // Searching the BODY, not the titles. Someone looking for "cancellation window" or "data
  // retention" cannot know which contract holds it.
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
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Terms &amp; Policies</h1>
        <p className="text-sm text-muted mt-3">Nothing has been published yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Terms &amp; Policies</h1>
      <p className="text-sm text-muted mt-2">
        Everything that governs your use of Immigroov.
      </p>

      <div className="mt-8 grid gap-8 md:grid-cols-[16rem_1fr] lg:grid-cols-[18rem_1fr]">
        {/* ── Outline ───────────────────────────────────────────────────────────── */}
        <div className="md:sticky md:top-24 md:self-start md:max-h-[calc(100vh-8rem)] md:overflow-y-auto md:pr-1">
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

          {/* Phone: documents as a native grouped select, which brings keyboard and
              screen-reader behaviour for free. Its sections live in the content pane below. */}
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

                        {/* The open document's sections, nested beneath it. The indent rule
                            is what makes this read as an outline rather than a second list. */}
                        {isActive && headings.length > 0 && (
                          <ul className="mt-1 mb-2 ml-4 flex flex-col gap-0.5 border-l border-[--color-border] pl-3">
                            {headings.map((h) => (
                              <li key={h.id}>
                                <a
                                  href={`#${h.id}`}
                                  className="block rounded-md px-2 py-1 text-[0.8rem] leading-snug text-muted
                                             hover:bg-brand-50/60 hover:text-brand-800"
                                >
                                  {h.text}
                                </a>
                              </li>
                            ))}
                          </ul>
                        )}
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
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h2 className="text-xl font-semibold tracking-tight text-brand-900">{current.title}</h2>
                {/* Version and date as a tag beside the title. As grey micro-text under the
                    heading it was effectively invisible, and for a contract the version a
                    reader is looking at is not a detail. */}
                <span className="shrink-0 rounded-full border border-[--color-border] bg-brand-50 px-2.5 py-0.5
                                 text-[0.7rem] font-medium text-brand-800 tabular-nums">
                  {current.version} · {when(current.last_updated)}
                </span>
              </div>
              {current.summary && <p className="text-sm text-muted mt-1.5">{current.summary}</p>}

              {/* Phone only: the sections, since the outline column collapses to a select. */}
              {headings.length >= 4 && (
                <nav aria-label={`Sections of ${current.title}`}
                  className="md:hidden mt-5 rounded-xl border border-[--color-border] bg-brand-50/40 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted/70">Sections</p>
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
