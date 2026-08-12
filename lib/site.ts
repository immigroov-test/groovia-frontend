// BUG-058: single source of truth for the site's canonical origin, used by metadataBase,
// sitemap.ts, and robots.ts so they can never drift from each other or from what's deployed.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://immigroov.com').replace(/\/$/, '');

// BUG-144: only the real site may be indexed. Staging and Vercel previews serve the same pages, so
// without this they compete with production for the same content and can be listed instead of it.
// Vercel sets VERCEL_ENV; anything that isn't a production deploy of the canonical host stays out of
// the index. NEXT_PUBLIC_ so the check is available wherever it is needed.
export const IS_PUBLIC_SITE =
  (process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? 'production') === 'production'
  && SITE_URL.includes('immigroov.com');

// Google Search Console ownership token. Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the value
// Google gives you and it is emitted as the verification meta tag.
export const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '';

