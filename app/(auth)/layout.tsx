import Link from 'next/link';
import { X } from 'lucide-react';
import { Logo } from '../../components/ui/Logo';

// BUG-144: covers login, signup, verify-email and both password pages in one place, since none of
// them declared metadata of their own. robots.txt already stops the crawl, but a Disallow does not
// prevent INDEXING: Google can list a URL it discovered elsewhere, showing a bare result with no
// description. noindex is the directive that actually keeps a sign-in page out of search results.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col hero-gradient">
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="relative w-full max-w-md animate-fade-up">
          <Link
            href="/home"
            aria-label="Close"
            className="absolute -top-2 -right-2 p-1.5 rounded-full text-muted hover:text-foreground hover:bg-black/5 transition-colors"
          >
            <X className="h-4 w-4" />
          </Link>
          <div className="flex justify-center mb-6">
            <Logo />
          </div>
          {children}
        </div>
      </main>
      <footer className="px-6 py-4 text-xs text-muted flex items-center justify-between">
        <span>© {new Date().getFullYear()} Immigroov</span>
        <div className="flex gap-4">
          <Link href="/privacy#privacy-policy" className="hover:text-foreground">Privacy</Link>
          <Link href="/privacy#website-terms-of-use" className="hover:text-foreground">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
