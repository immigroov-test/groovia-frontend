'use client';
import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../lib/utils';

// Renders a legal document's markdown. Used by the user-facing page, the admin
// editor preview, and the read-only archived-version view, so all three show
// exactly the same text the same way - a preview that renders differently from
// the published page is worse than no preview.
//
// No sanitizer here: react-markdown does not render raw HTML unless
// rehype-raw is added, so the markdown itself cannot inject markup. The content
// is authored by admins through the CMS, never by users.

/** A stable id for a heading. Same input always gives the same anchor, so a link to a
 *  clause keeps working across republishes as long as the heading text is unchanged. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')   // drop punctuation and emoji
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface LegalHeading {
  text: string;
  id: string;
  /** 2, 3 or 4, matching ##, ### and ####. */
  level: number;
  /** Derived clause number: '1', '1.2', '1.2.3'. Empty when the heading already carries its own. */
  number: string;
}

/** Strip a clause number the document wrote for itself, as in "4. Data Retention".
 *
 *  We number headings ourselves, from their nesting, so a document that also carries its own
 *  numbers printed them twice: "4 4. Data Retention". Ours wins, because it is derived from the
 *  structure and stays right when a section is added or moved, whereas a number typed into the
 *  text goes stale the moment anything shifts around it.
 *
 *  Anchored to the start and requires trailing text, so a heading that merely opens with a year
 *  or an amount keeps it. The document's own text is untouched on disk: this only affects what
 *  is displayed. */
function stripOwnNumber(text: string): string {
  return text.replace(/^\d+(\.\d+)*[.)]?\s+(?=\S)/, '');
}

/** The headings of a document, numbered, for a table of contents and for the rendered page.
 *
 *  The numbers are derived here rather than written into the markdown. Published text is
 *  immutable, and hard-coded numbers would drift the moment a section is added or reordered.
 *  Deriving them means a clause can be cited as "8.2.1" and that citation stays true to the
 *  text as it actually stands.
 *
 *  Lines inside fenced code blocks are ignored so a fenced `## ...` is not mistaken for a
 *  section, even though legal text rarely contains one. */
export function legalHeadings(content: string, docNumber?: string): LegalHeading[] {
  const out: LegalHeading[] = [];
  const counters = [0, 0, 0];   // ## , ### , ####
  let fenced = false;
  for (const line of content.split('\n')) {
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = /^(#{2,4})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    const depth = level - 2;
    counters[depth] += 1;
    // A new section restarts everything beneath it, so 2.1 follows 1.3 rather than continuing it.
    for (let i = depth + 1; i < counters.length; i += 1) counters[i] = 0;
    const raw = m[2].replace(/\*\*/g, '').trim();
    const text = stripOwnNumber(raw);
    // The anchor keeps using the RAW heading, so links already published against a numbered
    // heading keep resolving.
    // Rooted at the document's own number, so a section of document 4 reads 4.1 and its
    // sub-section 4.1.1. Without the root every document restarted at 1 and a citation like
    // "2.3" named a different clause depending on which document you were looking at.
    const local = counters.slice(0, depth + 1).join('.');
    out.push({
      text, id: headingId(raw), level,
      number: docNumber ? `${docNumber}.${local}` : local,
    });
  }
  return out;
}

/** id -> clause number, so the renderer can label a heading without re-deriving the order.
 *  First occurrence wins on a repeated heading text, matching how anchors already resolve. */
export function headingNumbers(content: string, docNumber?: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const h of legalHeadings(content, docNumber)) if (!m.has(h.id)) m.set(h.id, h.number);
  return m;
}

/** '04' -> '4'. The catalogue code IS the document's number, so citations stay stable whoever
 *  is reading: the region filter hides one Customer T&C edition, and a positional number would
 *  quietly mean something different in India than elsewhere. */
export function docNumberFromCode(code?: string | null): string {
  const n = parseInt(String(code ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? String(n) : '';
}

/** react-markdown hands children as nodes, not a string; flatten to the visible text. */
function textOf(node: ReactNode): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  const el = node as { props?: { children?: ReactNode } };
  return el.props ? textOf(el.props.children) : '';
}

export function LegalMarkdown(
  { content, className, docNumber }:
  { content: string; className?: string; docNumber?: string },
) {
  const numbers = headingNumbers(content, docNumber);
  // A separate span so the number can be dimmed, but inside the heading so that copying the
  // heading copies its number with it.
  const label = (id: string) => {
    const n = numbers.get(id);
    return n ? <span className="mr-2 font-normal tabular-nums text-brand-500">{n}</span> : null;
  };
  return (
    <div className={cn('prose-legal text-sm', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings carry an id so a clause can be linked to directly. scroll-mt clears
          // the fixed nav, otherwise jumping to a clause parks it under the header.
          h2: ({ children }) => {
            const raw = textOf(children);
            const id = headingId(raw);
            return <h2 id={id} className="scroll-mt-24">{label(id)}{stripOwnNumber(raw)}</h2>;
          },
          h3: ({ children }) => {
            const raw = textOf(children);
            const id = headingId(raw);
            return <h3 id={id} className="scroll-mt-24">{label(id)}{stripOwnNumber(raw)}</h3>;
          },
          h4: ({ children }) => {
            const raw = textOf(children);
            const id = headingId(raw);
            return <h4 id={id} className="scroll-mt-24">{label(id)}{stripOwnNumber(raw)}</h4>;
          },
          // A fee schedule or retention table must not force the whole page to
          // scroll sideways on a phone; it scrolls inside its own box instead.
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table>{children}</table>
            </div>
          ),
          // External references in these documents (regulators, the parent
          // company's registry entry) should not silently replace the page.
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
