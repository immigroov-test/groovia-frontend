'use client';
import { usePathname } from 'next/navigation';
import { SiteFooter } from './SiteFooter';

// Where the layout puts the footer, and where it deliberately does not.
//
// The shell is one fixed-height scroll container (#app-scroll). Most pages are documents
// that flow inside it, so a footer at the end costs nothing. The chat surface is different:
// it fills the viewport and owns an inner scroller for its own content, so a footer added
// below it makes the OUTER container scroll too, and the page ends up with two scrollbars
// side by side.
//
// On those routes the footer is rendered by ChatInterface instead, inside its own scroll
// area, so the same link appears at the end of the page with a single scrollbar. This
// component is what keeps the layout from adding a second copy.
const OWNS_ITS_SCROLL = new Set(['/', '/home']);

export function FooterSlot() {
  const pathname = usePathname();
  if (OWNS_ITS_SCROLL.has(pathname)) return null;
  return <SiteFooter />;
}
