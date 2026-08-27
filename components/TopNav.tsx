'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Menu, X, LogOut, LogIn, ChevronDown, Camera, FileText, Shield } from 'lucide-react';
import { Button } from './ui/Button';
import { UI_CONTENT } from '../lib/content';
import { clearLocalChat } from '../lib/chatStorage';
import { createClient } from '../lib/supabase/client';
import { LocationBadge } from './LocationBadge';
import { cn } from '../lib/utils';

interface Props {
  authed: boolean;
  email?: string | null;
  role?: string | null;
  name?: string | null;
  photoUrl?: string | null;
}

// Fixed top nav: floating logo (no background) on the left, a centered links pill,
// and auth on the right. Always visible. Mobile uses a hamburger menu.
// Where a signed-in customer goes when they ask to become a mentor: the contact form, with the
// topic and an opening line filled in. Support converts the account, because one email cannot be
// both a customer and a mentor today.
const JOIN_AS_MENTOR_CONTACT =
  `/contact?topic=${encodeURIComponent('Join as a Mentor')}`
  + `&message=${encodeURIComponent('I want to join as a mentor.')}`;

export function TopNav({ authed, email, role, name, photoUrl }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);   // desktop email pill -> sign out
  const [signingOut, setSigningOut] = useState(false);

  // Refs so a click anywhere outside an open dropdown closes it (standard menu behaviour).
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen && !userMenuOpen) return;
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (menuOpen && !menuBtnRef.current?.contains(t) && !menuPanelRef.current?.contains(t)) setMenuOpen(false);
      if (userMenuOpen && !userMenuRef.current?.contains(t)) setUserMenuOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setMenuOpen(false); setUserMenuOpen(false); }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen, userMenuOpen]);

  function hrefFor(realHref: string, gated: boolean): string {
    if (!gated || authed) return realHref;
    return `${pathname}?auth=open&next=${encodeURIComponent(realHref)}`;
  }

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    clearLocalChat();
    window.location.href = '/home';
  }

  function openSignIn() {
    router.push(`${pathname}?auth=open&mode=login`);
  }

  const nav = [
    { href: '/home', label: UI_CONTENT.sidebar.chat, gated: false },
    { href: '/about', label: UI_CONTENT.sidebar.about, gated: false },
    { href: '/mentors', label: UI_CONTENT.sidebar.mentors, gated: false },
    // BUG-083: hidden for mentors. Its Profile tab repeats what they edit in the mentor hub, and its
    // Sessions tab is scoped to role="mentee", which is empty for someone who does not book sessions.
    // Two tabs that either duplicate or show nothing read as a broken page, not a spare one.
    ...(role !== 'mentor' ? [{ href: '/account', label: UI_CONTENT.sidebar.account, gated: true }] : []),
    // BUG-067: decide the destination HERE, from the role we already hold, rather than sending
    // everyone to /mentor and letting it bounce. The old path was a client-side navigation through
    // two server redirects (/mentor -> /mentor/onboarding -> /contact), and a redirect chain is
    // both fragile and invisible to the user. A signed-in customer now goes straight to the
    // prefilled contact form in one hop. The server guards on those pages stay as a safety net for
    // anyone typing the URL directly, but the normal click no longer relies on them.
    ...(role !== 'admin' ? [{
      href: role === 'mentor' ? '/mentor' : authed ? JOIN_AS_MENTOR_CONTACT : '/mentor',
      label: role === 'mentor' ? UI_CONTENT.sidebar.mentorHub : UI_CONTENT.sidebar.mentorPortal,
      gated: false,
    }] : []),
    ...(role === 'admin' ? [{ href: '/admin', label: UI_CONTENT.sidebar.admin, gated: false }] : []),
    { href: '/contact', label: UI_CONTENT.sidebar.contact, gated: false },
  ];

  return (
    <header className="fixed top-0 inset-x-0 z-40 h-16 bg-brand-50">
      <div className="mx-auto max-w-6xl h-full px-4 sm:px-6 flex items-center gap-3">
        {/* Left section: logo. flex-1 so the left + right sides carry equal weight,
            which keeps the centered nav truly centered without overlapping either. */}
        <div className="flex-1 flex items-center min-w-0">
        <Link href="/home" aria-label="Immigroov home" className="shrink-0 inline-flex items-center">
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
        </div>

        {/* Center: nav pill, in normal flow (shrink-0) and NOT absolutely positioned.
            Only shown at lg+ where there's room for logo + full pill + auth. Between md
            and lg the pill was wide enough to squeeze the logo out of its column and slide
            under it, so below lg everything folds into the hamburger instead. */}
        <nav className="hidden lg:flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-md shadow-[0_4px_18px_-6px_rgba(15,23,42,0.18)] px-2 py-1.5 shrink-0">
          {nav.map(({ href, label, gated }) => {
            const active = href === '/account' ? pathname.startsWith('/account') : pathname === href;
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

        {/* Right section: auth (desktop) + hamburger (mobile). flex-1 + justify-end
            mirrors the left section; min-w-0 lets the email truncate instead of
            pushing into the nav. */}
        <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
        {/* Desktop (lg+): auth pill. Below lg it lives in the hamburger menu. */}
        <div className="hidden lg:flex items-center gap-2 min-w-0">
          {authed ? (
            // Single pill: avatar + email + chevron. Click reveals Sign out. Merging the
            // two buttons frees up room to show more of the email (desktop only).
            <div
              ref={userMenuRef}
              className="relative min-w-0"
              onMouseEnter={() => setUserMenuOpen(true)}
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <button
                type="button"
                onClick={() => setUserMenuOpen((v) => !v)}
                title={email ?? undefined}
                aria-haspopup="menu"
                aria-expanded={userMenuOpen}
                className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full bg-card/90 backdrop-blur-md shadow-[0_4px_18px_-6px_rgba(15,23,42,0.18)] min-w-0"
              >
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="h-6 w-6 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="h-6 w-6 shrink-0 rounded-full bg-gradient-to-br from-brand-700 to-accent-500 flex items-center justify-center text-white text-[10px] font-semibold">
                    {(name?.[0] ?? email?.[0] ?? 'U').toUpperCase()}
                  </div>
                )}
                <span className="text-sm text-brand-900 font-medium truncate max-w-[200px] lg:max-w-[320px]">{name || email}</span>
                <ChevronDown className={cn('h-3.5 w-3.5 text-muted shrink-0 transition-transform', userMenuOpen && 'rotate-180')} />
              </button>
              {userMenuOpen && (
                <div className="absolute top-full right-0 pt-2">
                  <div className="w-44 rounded-xl bg-card shadow-[0_8px_30px_-8px_rgba(15,23,42,0.3)] border border-[--color-border] p-1.5">
                    <Link
                      href="/legal"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-brand-50/60 hover:text-brand-900"
                    >
                      <FileText className="h-4 w-4" /> Legal documents
                    </Link>
                    <Link
                      href="/legal/data-subject-request"
                      onClick={() => setUserMenuOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-brand-50/60 hover:text-brand-900"
                    >
                      <Shield className="h-4 w-4" /> Your data rights
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted hover:bg-brand-50/60 hover:text-brand-900 disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4" /> {signingOut ? 'Signing out…' : 'Sign out'}
                    </button>
                    {/* Location tag lives under Sign out (desktop) instead of the main nav. */}
                    <LocationBadge />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={openSignIn}>
              <LogIn className="h-4 w-4" /> Login
            </Button>
          )}
        </div>

        {/* Below lg: hamburger (holds nav + auth). Labelled + bordered so it reads as the
            primary menu affordance on tablet/desktop widths, not a tiny icon. */}
        <button
          ref={menuBtnRef}
          type="button"
          className="lg:hidden inline-flex items-center gap-1.5 pl-2.5 pr-3 py-2 rounded-full bg-card border border-brand-200 shadow-[0_4px_14px_-4px_rgba(15,23,42,0.25)] text-brand-900 hover:bg-brand-50 transition-colors"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="hidden sm:inline text-sm font-medium">Menu</span>
        </button>
        </div>
      </div>

      {/* Menu (below lg) */}
      {menuOpen && (
        <div ref={menuPanelRef} className="lg:hidden mx-4 mt-1 rounded-2xl bg-card shadow-[0_8px_30px_-8px_rgba(15,23,42,0.3)] border border-[--color-border] px-3 py-3 flex flex-col gap-1">
          {/* Signed-in profile header: photo (or an "upload photo" placeholder), name, email.
              The whole row and the placeholder lead to wherever that person actually edits it.
              BUG-083: for a mentor that is their own profile form, NOT /account - hiding the
              Account item from the nav above while this row still linked to it meant a mentor on a
              phone tapped their avatar and landed on the redundant page anyway. */}
          {authed && (
            <Link
              href={role === 'mentor' ? '/mentor/profile' : '/account'}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 px-2 py-2 mb-1 rounded-xl hover:bg-brand-50/60"
            >
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="" className="h-11 w-11 rounded-full object-cover shrink-0" />
              ) : (
                <span className="h-11 w-11 rounded-full shrink-0 bg-brand-50 border border-dashed border-brand-300 flex items-center justify-center text-brand-600">
                  <Camera className="h-4 w-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-brand-900 truncate">{name || 'Your profile'}</p>
                {email && <p className="text-xs text-muted truncate">{email}</p>}
                {!photoUrl && <p className="text-[11px] font-medium text-accent-600 mt-0.5">Upload photo</p>}
              </div>
            </Link>
          )}
          {nav.map(({ href, label, gated }) => (
            <Link
              key={href}
              href={hrefFor(href, gated)}
              onClick={() => setMenuOpen(false)}
              className={cn(
                'px-3 py-2.5 rounded-xl text-sm font-medium',
                (href === '/account' ? pathname.startsWith('/account') : pathname === href)
                  ? 'bg-brand-50 text-brand-900'
                  : 'text-muted hover:bg-brand-50/60',
              )}
            >
              {label}
            </Link>
          ))}
          <div className="mt-1">
            {authed && (
              <Link
                href="/legal"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-brand-50/60"
              >
                <FileText className="h-4 w-4" /> Legal documents
              </Link>
            )}
            {authed && (
              <Link
                href="/legal/data-subject-request"
                onClick={() => setMenuOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:bg-brand-50/60"
              >
                <Shield className="h-4 w-4" /> Your data rights
              </Link>
            )}
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
          <LocationBadge />
        </div>
      )}
    </header>
  );
}
