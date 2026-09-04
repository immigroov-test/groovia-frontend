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
  /** Derived clause number: '1', '1.2', '1.2.3'. */
  number: string;
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
export function legalHeadings(content: string): LegalHeading[] {
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
    const text = m[2].replace(/\*\*/g, '').trim();
    out.push({ text, id: headingId(text), level, number: counters.slice(0, depth + 1).join('.') });
  }
  return out;
}

/** id -> clause number, so the renderer can label a heading without re-deriving the order.
 *  First occurrence wins on a repeated heading text, matching how anchors already resolve. */
export function headingNumbers(content: string): Map<string, string> {
  const m = new Map<string, string>();
  for (const h of legalHeadings(content)) if (!m.has(h.id)) m.set(h.id, h.number);
  return m;
}

/** react-markdown hands children as nodes, not a string; flatten to the visible text. */
function textOf(node: ReactNode): string {
  if (node == null || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  const el = node as { props?: { children?: ReactNode } };
  return el.props ? textOf(el.props.children) : '';
}

export function LegalMarkdown({ content, className }: { content: string; className?: string }) {
  const numbers = headingNumbers(content);
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
            const id = headingId(textOf(children));
            return <h2 id={id} className="scroll-mt-24">{label(id)}{children}</h2>;
          },
          h3: ({ children }) => {
            const id = headingId(textOf(children));
            return <h3 id={id} className="scroll-mt-24">{label(id)}{children}</h3>;
          },
          h4: ({ children }) => {
            const id = headingId(textOf(children));
            return <h4 id={id} className="scroll-mt-24">{label(id)}{children}</h4>;
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
