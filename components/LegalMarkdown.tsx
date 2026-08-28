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

/** The `##` headings of a document, for a table of contents.
 *  Lines inside fenced code blocks are ignored so a fenced `## ...` is not mistaken
 *  for a section, even though legal text rarely contains one. */
export function legalHeadings(content: string): { text: string; id: string }[] {
  const out: { text: string; id: string }[] = [];
  let fenced = false;
  for (const line of content.split('\n')) {
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const m = /^##\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      const text = m[1].replace(/\*\*/g, '').trim();
      out.push({ text, id: headingId(text) });
    }
  }
  return out;
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
  return (
    <div className={cn('prose-legal text-sm', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings carry an id so a clause can be linked to directly. scroll-mt clears
          // the fixed nav, otherwise jumping to a clause parks it under the header.
          h2: ({ children }) => (
            <h2 id={headingId(textOf(children))} className="scroll-mt-24">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 id={headingId(textOf(children))} className="scroll-mt-24">{children}</h3>
          ),
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
