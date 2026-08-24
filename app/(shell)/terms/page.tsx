import { permanentRedirect } from 'next/navigation';

// There is one public legal page now, and it lives at /privacy. This route stays alive
// because /terms is linked from the signup form, the mentor onboarding form, the
// booking widget, the session detail page ("Refund policy") and the sitemap - links
// that would otherwise 404, including ones on pages we do not control.
//
// permanentRedirect (308) rather than a soft redirect so search engines transfer the
// indexing /terms has accumulated to /privacy instead of treating them as rivals for
// the same content.
export default function TermsPage() {
  permanentRedirect('/privacy');
}
