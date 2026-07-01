'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, LogIn } from 'lucide-react';
import { Button } from './ui/Button';
import { UI_CONTENT } from '../lib/content';
import { clearLocalChat } from '../lib/chatStorage';
import { createClient } from '../lib/supabase/client';
import { cn } from '../lib/utils';

interface Props {
  authed: boolean;
  email?: string | null;
  role?: string | null;
}

// Fixed top nav: floating logo (no background) on the left, a centered links pill,
// and auth on the right. Always visible. Mobile uses a hamburger menu.
export function TopNav({ authed, email, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  function hrefFor(realHref: string, gated: boolean): string {
    if (!gated || authed) return realHref;
    return `${pathname}?auth=open&next=${encodeURIComponent(realHref)}`;
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    clearLocalChat();
    window.location.href = '/chat';
  }

  function openSignIn() {
    router.push(`${pathname}?auth=open&mode=login`);
  }

  const nav = [
    { href: '/chat', label: UI_CONTENT.sidebar.chat, gated: false },
    { href: '/mentors', label: UI_CONTENT.sidebar.mentors, gated: true },
    { href: '/about', label: UI_CONTENT.sidebar.about, gated: false },
    { href: '/account', label: UI_CONTENT.sidebar.account, gated: true },
    ...(role !== 'admin' ? [{ href: '/mentor', label: UI_CONTENT.sidebar.mentorPortal, gated: false }] : []),
    ...(role === 'admin' ? [{ href: '/admin', label: UI_CONTENT.sidebar.admin, gated: false }] : []),
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-16">
      <div className="relative mx-auto max-w-6xl h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Floating logo — no background */}
        <Link href="/chat" aria-label="Immigroov home" className="shrink-0 inline-flex items-center">
          <Image
            src="/Immigroov_Transparent_Logo.png"
            alt="Immigroov"
            width={280}
            height={60}
            priority
            className="object-contain"
            style={{ height: '26px', width: 'auto' }}
          />
        </Link>

        {/* Desktop: centered links pill */}
        <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-center gap-1 rounded-full bg-card/90 backdrop-blur-md shadow-[0_4px_18px_-6px_rgba(15,23,42,0.18)] px-2 py-1.5">
          {nav.map(({ href, label, gated }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={hrefFor(href, gated)}
                className={cn(
                  'px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors',
                  active ? 'text-brand-900 bg-brand-50' : 'text-muted hover:text-brand-900 hover:bg-brand-50/60',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop: auth on the right */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {authed ? (
            <>
              <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-card/90 backdrop-blur-md shadow-[0_4px_18px_-6px_rgba(15,23,42,0.18)]">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white text-[10px] font-semibold">
                  {(email?.[0] ?? 'U').toUpperCase()}
                </div>
                <span className="text-sm text-brand-900 font-medium max-w-[140px] truncate">{email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} loading={signingOut} className="bg-card/90 backdrop-blur-md">
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={openSignIn}>
              <LogIn className="h-4 w-4" /> Login
            </Button>
          )}
        </div>

        {/* Mobile: hamburger */}
        <button
          type="button"
          className="md:hidden p-2 rounded-full bg-card/90 backdrop-blur-md shadow-[0_4px_14px_-4px_rgba(15,23,42,0.25)] text-brand-900"
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden mx-4 mt-1 rounded-2xl bg-card shadow-[0_8px_30px_-8px_rgba(15,23,42,0.3)] border border-[--color-border] px-3 py-3 flex flex-col gap-1">
          {nav.map(({ href, label, gated }) => (
            <Link
              key={href}
              href={hrefFor(href, gated)}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-sm font-medium',
                pathname === href ? 'bg-brand-50 text-brand-900' : 'text-muted hover:bg-brand-50/60',
              )}
            >
              {label}
            </Link>
          ))}
          <div className="mt-1 pt-2 border-t border-[--color-border]">
            {authed ? (
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-brand-50/60 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            ) : (
              <Button className="w-full" onClick={() => { setMenuOpen(false); openSignIn(); }}>
                <LogIn className="h-4 w-4" /> Login
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
