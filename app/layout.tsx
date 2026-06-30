import type { Metadata } from 'next';
import { Lato, Roboto_Serif, Geist_Mono } from 'next/font/google';
import './globals.css';

// Odyssey-style pairing: serif headings (Roboto Serif) + clean sans body (Lato).
const lato = Lato({ variable: '--font-lato', subsets: ['latin'], weight: ['300', '400', '700'] });
const robotoSerif = Roboto_Serif({ variable: '--font-roboto-serif', subsets: ['latin'], weight: ['500', '600', '700'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Immigroov — AI-powered immigration mentorship',
  description:
    'Discover countries that fit your story, prepare your CV, and connect with mentors who have lived the move.',
  icons: { icon: '/favicon.ico' },
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
