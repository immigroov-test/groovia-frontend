import Link from 'next/link';

// The site-wide footer. Until this existed the only persistent legal links lived on the
// auth pages, so a visitor browsing mentors or reading a profile had no route to the
// policies at all. A reachable-from-every-page link is the placement regulators, ad
// platforms and app stores all check for.
//
// One link to the policies, not nine. Listing every document here duplicated the index that
// /privacy already is, and a row of nine legal links reads as heavier and more alarming than
// the single destination it stands for. Anyone after a specific policy reaches it in one
// more click, from a page built to navigate them.
const LINKS = [
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
