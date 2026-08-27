import Link from 'next/link';

/** A persistent, low-profile path to the legal documents and Data Subject Rights for a
 * SIGNED-OUT visitor. The (shell) layout has no footer anywhere in the app (only the
 * (auth) pages do), and TopNav shows only a Login button when signed out - so without
 * this, a browsing visitor has no persistent way to reach either.
 *
 * Signed-in users already have both via TopNav's user menu (see components/TopNav.tsx),
 * so this renders only for `!authed` - it is not a general-purpose footer.
 *
 * Deliberately independent of CookieConsent's own corner link, which only renders in
 * regions where cookie consent is required (opt-in/opt-out) and returns null everywhere
 * else - Terms/Privacy/Data Subject Rights have to be reachable everywhere, not just
 * where the cookie banner happens to apply. */
export function LegalFooterLink({ authed }: { authed: boolean }) {
  if (authed) return null;
  return (
    <div className="fixed bottom-1.5 right-2.5 z-30 flex items-center gap-3 text-[10px] sm:text-[11px] leading-none text-muted/70">
      <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">Legal</Link>
      <Link href="/legal/data-subject-request" className="underline underline-offset-2 hover:text-foreground">Your data rights</Link>
    </div>
  );
}
