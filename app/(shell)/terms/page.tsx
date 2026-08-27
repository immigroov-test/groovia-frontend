import { permanentRedirect } from 'next/navigation';

// There is one public legal page now, and it lives at /privacy. This route stays alive
// because /terms is linked from older emails, the sitemap and pages we do not control -
// links that would otherwise 404.
//
// It redirects to the Website Terms of Use SECTION, not to the top of the page. /privacy
// renders fourteen contracts as collapsed sections, so landing a reader at the top means
// handing them a list of titles and asking them to guess which one they came for. The
// fragment survives a 308 (it is a Location header like any other), and PublicLegalPage
// opens the section the hash names.
//
// permanentRedirect (308) rather than a soft redirect so search engines transfer the
// indexing /terms has accumulated to /privacy instead of treating them as rivals for
// the same content.
export default function TermsPage() {
  permanentRedirect('/privacy#website-terms-of-use');
}
