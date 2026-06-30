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

// Single top navigation bar (replaces the old left sidebar + mobile drawer + top auth bar).
// Sticky, full-width, responsive: inline links on desktop, hamburger menu on mobile.
export function TopNav({ authed, email, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // For guests, gated links open the auth modal over the current page.
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
    { href: '/account', label: UI_CONTENT.sidebar.account, gated: true },
    ...(role !== 'admin' ? [{ href: '/mentor', label: UI_CONTENT.sidebar.mentorPortal, gated: false }] : []),
    ...(role === 'admin' ? [{ href: '/admin', label: UI_CONTENT.sidebar.admin, gated: false }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-card/85 backdrop-blur-md border-b border-[--color-border]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
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

        {/* Desktop links */}
        <nav className="hidden md:flex items-center gap-1">
          {nav.map(({ href, label, gated }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={hrefFor(href, gated)}
                className={cn(
                  'px-3.5 py-2 rounded-full text-sm font-medium transition-colors',
                  active ? 'text-brand-900 bg-brand-50' : 'text-muted hover:text-brand-900 hover:bg-brand-50/60',
                )}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Auth (desktop) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {authed ? (
            <>
              <div className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-brand-50">
                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white text-[10px] font-semibold">
                  {(email?.[0] ?? 'U').toUpperCase()}
                </div>
                <span className="text-sm text-brand-900 font-medium max-w-[160px] truncate">{email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut} loading={signingOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={openSignIn}>
              <LogIn className="h-4 w-4" /> Login
            </Button>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-full text-brand-900 hover:bg-brand-50"
          aria-label="Menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[--color-border] bg-card px-4 py-3 flex flex-col gap-1">
          {nav.map(({ href, label, gated }) => (
            <Link
              key={href}
              href={hrefFor(href, gated)}
              onClick={() => setOpen(false)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-sm font-medium',
                pathname === href ? 'bg-brand-50 text-brand-900' : 'text-muted hover:bg-brand-50/60 hover:text-brand-900',
              )}
            >
              {label}
            </Link>
          ))}
          <div className="mt-2 pt-2 border-t border-[--color-border]">
            {authed ? (
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-brand-50/60 disabled:opacity-50"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            ) : (
              <Button className="w-full" onClick={() => { setOpen(false); openSignIn(); }}>
                <LogIn className="h-4 w-4" /> Login
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
