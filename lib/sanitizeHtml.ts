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
