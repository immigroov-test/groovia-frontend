import type { Metadata } from 'next';
import { Lato, Roboto_Serif, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SITE_URL } from '../lib/site';

// Odyssey-style pairing: serif headings (Roboto Serif) + clean sans body (Lato).
const lato = Lato({ variable: '--font-lato', subsets: ['latin'], weight: ['300', '400', '700'] });
const robotoSerif = Roboto_Serif({ variable: '--font-roboto-serif', subsets: ['latin'], weight: ['500', '600', '700'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

const SITE_TITLE = 'Immigroov - AI-powered immigration mentorship';
const SITE_DESCRIPTION =
  'Discover countries that fit your story, prepare your CV, and connect with mentors who have lived the move.';

export const metadata: Metadata = {
  // BUG-058: metadataBase is what turns every page's (and mentor page's) relative OG/Twitter image
  // paths into absolute URLs - without it, social previews silently fail to resolve. No
  // title.template here: every existing page already appends its own "- Immigroov" suffix by hand
  // (see e.g. app/(shell)/mentors/page.tsx), and a template would double that up on all of them.
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  icons: { icon: '/favicon.ico' },
  openGraph: {
    type: 'website',
    siteName: 'Immigroov',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    images: [{ url: '/Immigroov_Transparent_Logo.png', width: 512, height: 512, alt: 'Immigroov' }],
  },
  twitter: {
    card: 'summary',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/Immigroov_Transparent_Logo.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${lato.variable} ${robotoSerif.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
