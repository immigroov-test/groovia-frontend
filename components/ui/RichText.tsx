'use client';
import { useEffect, useState } from 'react';
import { sanitizeRichText } from '../../lib/sanitizeHtml';
import { cn } from '../../lib/utils';

// Renders sanitized mentor rich text. Sanitizes in the browser (DOMPurify) after mount,
// so it works when embedded in server components without needing jsdom on the server.
export function RichText({ html, className }: { html: string; className?: string }) {
  const [clean, setClean] = useState('');
  useEffect(() => { setClean(sanitizeRichText(html)); }, [html]);

  return (
    <div
      className={cn('rich-text text-sm text-foreground/80 leading-relaxed', className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
