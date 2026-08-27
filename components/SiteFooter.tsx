import Link from 'next/link';

// The site-wide footer. Until now the only persistent legal links lived on the auth
// pages, so a visitor browsing mentors, reading a profile or sitting on the home page
// had no route to the Privacy Policy at all. A reachable-from-every-page privacy link
// is the one placement regulators, ad platforms and app stores all check for, and it is
// what any visitor looks for first.
//
// Each link names its section rather than pointing at the top of /privacy: that page
// renders fourteen contracts as collapsed sections, so an unanchored link hands the
// reader a list of titles instead of the document they asked for.
const LEGAL = [
  { href: '/privacy#privacy-policy', label: 'Privacy Policy' },
  { href: '/privacy#website-terms-of-use', label: 'Terms of Use' },
  { href: '/privacy#cookie-policy', label: 'Cookie Policy' },
  { href: '/privacy#refund-cancellation-policy', label: 'Refund & Cancellation' },
  { href: '/privacy#payment-terms', label: 'Payment Terms' },
  { href: '/privacy#ai-disclosure-notice', label: 'AI Disclosure' },
  { href: '/privacy#data-subject-rights', label: 'Your Data Rights' },
];

const COMPANY = [
  { href: '/about', label: 'About' },
  { href: '/mentors', label: 'Find a mentor' },
  { href: '/mentor/register', label: 'Become a mentor' },
  { href: '/contact', label: 'Contact' },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[--color-border] bg-card/40 mt-16">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        {/* One column on a phone, two from sm, so the link lists never sit in a squeezed
            half-width column on a small screen. */}
        <div className="grid gap-8 sm:grid-cols-2">
          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal" className="text-sm font-medium text-brand-900">Legal</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted hover:text-foreground hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/privacy" className="text-sm text-brand-700 hover:underline">
                  All legal documents
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-labelledby="footer-company">
            <h2 id="footer-company" className="text-sm font-medium text-brand-900">Immigroov</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {COMPANY.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-muted hover:text-foreground hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p className="mt-10 pt-6 border-t border-[--color-border] text-xs text-muted">
          &copy; {new Date().getFullYear()} Immigroov. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
