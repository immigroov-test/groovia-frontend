import DOMPurify from 'dompurify';

// Whitelist for mentor-authored rich text (bio). Keep it tight - only basic
// formatting and safe links.
const CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

// DOMPurify needs a real DOM, so it only runs in the browser. On the server we
// return '' and let the client render the sanitized HTML after hydration (see RichText).
// This avoids pulling jsdom into the serverless bundle.
export function sanitizeRichText(html: string): string {
  if (typeof window === 'undefined') return '';
  return DOMPurify.sanitize(html ?? '', CONFIG).trim();
}

// True when the rich text has no visible content. Tag-stripping regex so it works
// on both server and client without a DOM.
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';
}

// Plain-text preview of rich text: strip tags and decode the entities our editor
// emits, collapsing whitespace. For compact previews (e.g. a service list) where
// showing raw HTML tags is wrong and full formatting isn't needed. Works on server
// and client (no DOM).
export function richTextToPlain(html: string | null | undefined): string {
  if (!html) return '';
  return html
    .replace(/<\/?(p|div|br|li|h[1-6]|ul|ol)\b[^>]*>/gi, ' ')  // block boundaries -> space
    .replace(/<[^>]*>/g, '')                                    // remaining inline tags
    .replace(/&nbsp;/gi, ' ')
    .replace(/&rsquo;|&lsquo;|&#39;/gi, "'")
    .replace(/&rdquo;|&ldquo;|&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}
