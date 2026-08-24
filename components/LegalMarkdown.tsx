'use client';
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
export function LegalMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn('prose-legal text-sm', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
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
