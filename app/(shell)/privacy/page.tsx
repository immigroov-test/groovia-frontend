import { serverGetPublic } from '../../../lib/backend';
import { PageLoadError } from '../../../components/PageLoadError';
import { PublicLegalPage, type PublicLegalDocument } from '../../../components/PublicLegalPage';

export const metadata = {
  title: 'Privacy Policy & Legal Documents - Immigroov',
  alternates: { canonical: '/privacy' },
};

// The one public legal page: all fourteen documents as collapsible sections, served
// from the Legal Documents CMS rather than from files in this repo. An admin editing
// the Privacy Policy updates this page without a deploy, and there is a single source
// of truth instead of a repo copy that drifts from what was actually published.
//
// It lives at /privacy because that URL is already linked from the cookie banner, the
// signup form, the mentor onboarding form and the sitemap. Moving it would break links
// we do not control and throw away the indexing that URL has already earned; /terms
// 308s here.
//
// The RESPONSE is cached for an hour, not the route. A route-level `revalidate` would
// do nothing: this page sits under the (shell) layout, which reads cookies() and so
// forces every page beneath it to render per request. Caching the fetch is what
// actually keeps a crawler from putting a backend round-trip behind every view.
//
// Worth being clear about the trade this makes: the old version of this page read
// markdown off local disk and therefore could not fail. This one depends on the
// backend, and an admin publishing a change waits up to an hour to see it here.
const CACHE_SECONDS = 3600;

export default async function PrivacyPage() {
  const res = await serverGetPublic<PublicLegalDocument[]>(
    '/legal/public', 12000, 1, CACHE_SECONDS,
  );

  // An empty array is a real answer (nothing published yet) and the page says so.
  // A failed fetch is not - rendering "no legal documents" because the backend blinked
  // would be a false statement about a page people rely on.
  if (!res.ok || !Array.isArray(res.data)) return <PageLoadError retryHref="/privacy" />;

  return <PublicLegalPage docs={res.data} />;
}
