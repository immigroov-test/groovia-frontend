'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, LogOut, LogIn } from 'lucide-react';
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

// Floating top nav: the logo stays fixed top-left (no background, always visible);
// the links + auth auto-hide on scroll, leaving a chevron arrow you can click to
// expand (arrow ▲) or collapse (arrow ▼).
export function TopNav({ authed, email, role }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const el = document.getElementById('app-scroll');
    if (!el) return;
    let lastY = el.scrollTop;
    const onScroll = () => {
      const y = el.scrollTop;
      if (y < 10) setOpen(true);            // at the top → show
      else if (y > lastY + 6) setOpen(false); // scrolling down → hide
      lastY = y;
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

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

  const hideCls = open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-16 pointer-events-none';

  return (
    <>
      {/* Floating logo — fixed, transparent, always visible */}
      <Link href="/chat" aria-label="Immigroov home" className="fixed top-4 left-5 z-50 inline-flex items-center">
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

      {/* Arrow toggle — fixed, always visible; flips direction with state */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Hide menu' : 'Show menu'}
        className="fixed top-3.5 right-5 z-50 h-9 w-9 rounded-full bg-card shadow-[0_4px_14px_-4px_rgba(15,23,42,0.25)] flex items-center justify-center text-brand-900 hover:bg-brand-50 transition-colors"
      >
        {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
      </button>

      {/* Desktop: centered links pill */}
      <div className={cn('hidden md:flex fixed top-3 left-1/2 -translate-x-1/2 z-40 transition-all duration-300', hideCls)}>
        <nav className="flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-md shadow-[0_4px_18px_-6px_rgba(15,23,42,0.18)] px-2 py-1.5">
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
      </div>

      {/* Desktop: auth (to the left of the arrow toggle) */}
      <div className={cn('hidden md:flex fixed top-3.5 right-16 z-40 items-center gap-2 transition-all duration-300', hideCls)}>
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

      {/* Mobile: dropdown menu under the arrow */}
      {open && (
        <div className="md:hidden fixed top-14 right-4 left-4 z-40 rounded-2xl bg-card shadow-[0_8px_30px_-8px_rgba(15,23,42,0.3)] border border-[--color-border] px-3 py-3 flex flex-col gap-1">
          {nav.map(({ href, label, gated }) => (
            <Link
              key={href}
              href={hrefFor(href, gated)}
              onClick={() => setOpen(false)}
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
              <Button className="w-full" onClick={() => { setOpen(false); openSignIn(); }}>
                <LogIn className="h-4 w-4" /> Login
              </Button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
