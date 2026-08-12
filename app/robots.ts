import type { MetadataRoute } from 'next';
import { SITE_URL, IS_PUBLIC_SITE } from '../lib/site';

// BUG-058: no robots.txt existed, so crawlers had no explicit guidance and could just as easily
// spend their budget crawling/indexing signed-in-only account, admin, and API routes as the actual
// public marketing/mentor pages.
export default function robots(): MetadataRoute.Robots {
  // Staging/preview deployments serve the same content as production; letting them be crawled means
  // competing with the real site for it (BUG-144).
  if (!IS_PUBLIC_SITE) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }
  return {
    rules: {
      userAgent: '*',
      // /mentor/register is the public "become a mentor" page; the rest of /mentor/* (hub,
      // onboarding, availability, profile editor) is signed-in only. Longest-match wins, so this
      // allow overrides the broader /mentor disallow below for that one path.
      allow: ['/', '/mentor/register'],
      disallow: [
        '/api/', '/auth/', '/account/', '/admin', '/mentor', '/session/', '/meeting/', '/preview/',
        '/login', '/signup', '/forgot-password', '/reset-password', '/verify-email',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
