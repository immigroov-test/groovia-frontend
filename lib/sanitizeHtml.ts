import DOMPurify from 'isomorphic-dompurify';

// Whitelist for mentor-authored rich text (bio). Keep it tight — only basic
// formatting and safe links. Runs on both server (SSR) and client.
const CONFIG = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
};

export function sanitizeRichText(html: string): string {
  const clean = DOMPurify.sanitize(html ?? '', CONFIG);
  return clean.trim();
}

// True when the rich text has no visible content (only empty tags / whitespace).
export function isRichTextEmpty(html: string | null | undefined): boolean {
  if (!html) return true;
  return sanitizeRichText(html).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() === '';
}
