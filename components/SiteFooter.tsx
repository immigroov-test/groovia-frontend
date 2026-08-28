import Link from 'next/link';

// The site-wide footer. Until this existed the only persistent legal links lived on the
// auth pages, so a visitor browsing mentors or reading a profile had no route to the
// Privacy Policy at all. A privacy link reachable from every page is the placement
// regulators, ad platforms and app stores all check for.
//
// One wrapping row rather than titled columns. Two stacked columns with "Legal" and
// "Immigroov" headings turned a set of small links into a block of page furniture taller
// than some of the pages above it. Footer links are a reference people go looking for,
// not a section that needs announcing, so the headings are gone and the links sit side by
// side on one line, wrapping only when the screen is too narrow to hold them.
const LINKS = [
  { href: '/privacy#privacy-policy', label: 'Privacy Policy' },
  { href: '/privacy#website-terms-of-use', label: 'Terms of Use' },
  { href: '/privacy#cookie-policy', label: 'Cookie Policy' },
  { href: '/privacy#refund-cancellation-policy', label: 'Refunds' },
  { href: '/privacy#payment-terms', label: 'Payment Terms' },
  { href: '/privacy#ai-disclosure-notice', label: 'AI Disclosure' },
  { href: '/privacy#data-subject-rights', label: 'Your Data Rights' },
  { href: '/legal/data-subject-request', label: 'Make a data request' },
  { href: '/privacy', label: 'Terms & Policies' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-[--color-border]/50">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-7">
        <nav aria-label="Legal and company links">
          {/* Separators are drawn on the list items rather than typed between them, so a
              wrapped row never begins or ends with a stray divider. */}
          <ul className="flex flex-wrap items-center justify-center gap-y-2 text-xs">
            {LINKS.map((l) => (
              <li
                key={l.href}
                className="px-3 border-r border-[--color-border] last:border-r-0 leading-none"
              >
                <Link href={l.href} className="text-muted hover:text-foreground hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-5 text-center text-xs text-muted/70">
          &copy; {new Date().getFullYear()} Immigroov. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
