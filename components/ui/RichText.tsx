import { sanitizeRichText } from '../../lib/sanitizeHtml';
import { cn } from '../../lib/utils';

// Renders sanitized mentor rich text. Safe to use in server or client components.
export function RichText({ html, className }: { html: string; className?: string }) {
  const clean = sanitizeRichText(html);
  return (
    <div
      className={cn('rich-text text-sm text-foreground/80 leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
