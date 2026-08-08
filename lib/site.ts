// BUG-058: single source of truth for the site's canonical origin, used by metadataBase,
// sitemap.ts, and robots.ts so they can never drift from each other or from what's deployed.
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://immigroov.com').replace(/\/$/, '');
