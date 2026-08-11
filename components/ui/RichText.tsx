'use client';
import { forwardRef, useEffect, useState } from 'react';
import { sanitizeRichText } from '../../lib/sanitizeHtml';
import { cn } from '../../lib/utils';

// Renders sanitized mentor rich text. Sanitizes in the browser (DOMPurify) after mount,
// so it works when embedded in server components without needing jsdom on the server.
// Ref-forwarded so a caller that needs to line-clamp (BUG-135) or measure overflow can attach
// directly to THIS div - the one that actually holds the <p> children - instead of wrapping it in
// an extra div, which -webkit-line-clamp does not reliably truncate through.
export const RichText = forwardRef<HTMLDivElement, { html: string; className?: string }>(
  function RichText({ html, className }, ref) {
    const [clean, setClean] = useState('');
    useEffect(() => { setClean(sanitizeRichText(html)); }, [html]);

    return (
      <div
        ref={ref}
        className={cn('rich-text text-sm text-foreground/80 leading-relaxed', className)}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  },
);
