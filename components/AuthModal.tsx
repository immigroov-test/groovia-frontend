'use client';
import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { X, Check, Mail } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { GoogleButton } from './GoogleButton';
import { UI_CONTENT } from '../lib/content';

type Stage = 'email' | 'details' | 'sent';

function AuthModalInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = UI_CONTENT.auth;

  const isOpen = params.get('auth') === 'open';
  const next = params.get('next') ?? undefined;

  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ text: string; author: string }>({ ...UI_CONTENT.quote });

  useEffect(() => {
    if (isOpen) { setStage('email'); setEmail(''); setName(''); setIsNew(false); setError(null); }
  }, [isOpen]);

  // Daily quote — falls back to the default in content.ts if the API isn't reachable.
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/quote')
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => { if (q?.text) setQuote({ text: q.text, author: q.author ?? '' }); })
      .catch(() => {});
  }, [isOpen]);

  // While the popup is open, watch for sign-in — e.g. the user clicks the magic link
  // in another tab. Supabase syncs auth across tabs, so we close the popup and refresh
  // so this tab reflects the logged-in state too.
  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') { close(); router.refresh(); }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function close() {
    const p = new URLSearchParams(params.toString());
    ['auth', 'role', 'mode', 'next'].forEach((k) => p.delete(k));
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  function redirectTo(): string {
    const base = `${window.location.origin}/auth/callback`;
    return next ? `${base}?next=${encodeURIComponent(next)}` : base;
  }

  async function sendLink(create: boolean, fullName?: string) {
    const supabase = createClient();
    return supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: create,
        emailRedirectTo: redirectTo(),
        // Stored on the user at creation.
        data: fullName ? { full_name: fullName } : undefined,
      },
    });
  }

  // Step 1: email only. Ask the backend whether the account exists (no email sent) —
  // existing → send the login link now; new → advance to collect the name. Sending
  // exactly one link avoids Supabase's per-email OTP rate limit.
  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (res.ok) {
        const { exists } = await res.json();
        if (exists) {
          const { error } = await sendLink(false);
          setLoading(false);
          if (error) { setError(error.message); return; }
          setIsNew(false); setStage('sent');
          return;
        }
      }
      // New account (or the check is unavailable) → collect the name next.
      setLoading(false);
      setStage('details');
    } catch {
      setLoading(false);
      setStage('details');
    }
  }

  // Step 2 (new users only): collect the name, then create + send the link.
  async function handleDetails(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const { error } = await sendLink(true, name.trim() || undefined);
    setLoading(false);
    if (error) { setError(error.message); return; }
    setIsNew(true); setStage('sent');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-900/50 backdrop-blur-sm">
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) close(); }}
      >
        <div className="relative w-full max-w-4xl bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-up">
          <button
            type="button" onClick={close} aria-label="Close"
            className="absolute top-4 right-4 z-30 p-1.5 rounded-full text-white/80 md:text-white/80 hover:text-white hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Logo centered across the divider, in a white box so it reads on both sides */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 bg-white rounded-full px-5 py-2.5 shadow-md">
            <Image
              src="/Immigroov_Transparent_Logo.png" alt="Immigroov" width={280} height={60}
              priority
              className="object-contain"
              style={{ height: '26px', width: 'auto' }}
            />
          </div>

          {/* Left — form */}
          <div className="w-full md:w-1/2 px-7 sm:px-9 pt-20 pb-6 flex flex-col min-h-[440px]">
            {stage === 'email' && (
              <>
                <h2 className="text-2xl font-semibold tracking-tight text-brand-900 text-center">{t.heading}</h2>
                <p className="text-sm text-muted mt-1 text-center">{t.subheading}</p>
                <form onSubmit={handleEmail} className="mt-6 flex flex-col gap-3">
                  <Input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder} autoComplete="email" aria-label={t.emailLabel}
                    className="border border-brand-300 focus:border-brand-500"
                  />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading} className="w-full">
                    {t.continueWithEmail}
                  </Button>
                </form>
                <div className="my-4 flex items-center gap-3 text-xs text-muted">
                  <div className="h-px flex-1 bg-[--color-border]" /><span>{t.orDivider}</span><div className="h-px flex-1 bg-[--color-border]" />
                </div>
                <GoogleButton label={t.continueWithGoogle} next={next} />
                <p className="mt-4 text-[11px] leading-snug text-muted">
                  {t.termsNote}{' '}
                  <Link href="/terms" className="underline hover:text-foreground">{t.terms}</Link> and{' '}
                  <Link href="/privacy" className="underline hover:text-foreground">{t.privacy}</Link>.
                </p>
              </>
            )}
            {stage === 'details' && (
              <>
                <h2 className="text-2xl font-semibold tracking-tight text-brand-900 text-center">{t.detailsHeading}</h2>
                <p className="text-sm text-muted mt-1 text-center">{t.detailsSubheading}</p>
                <form onSubmit={handleDetails} className="mt-6 flex flex-col gap-3">
                  <Input
                    type="text" required autoFocus value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder} autoComplete="name" aria-label={t.nameLabel}
                    className="border border-brand-300 focus:border-brand-500"
                  />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading} className="w-full">
                    {t.continue}
                  </Button>
                </form>
                <button type="button" onClick={() => { setStage('email'); setError(null); }} className="mt-4 text-xs text-muted hover:text-foreground text-center">{t.back}</button>
              </>
            )}
            {stage === 'sent' && (
              <>
                <h2 className="text-2xl font-semibold tracking-tight text-brand-900">{t.linkHeading}</h2>
                <div className="mt-4 h-11 w-11 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
                  <Mail className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted mt-3 leading-relaxed">{t.linkSubheading(email)}</p>
                <div className="mt-6 flex items-center gap-4 text-xs">
                  <button type="button" onClick={() => sendLink(isNew, isNew ? name.trim() : undefined)} className="text-brand-700 hover:underline">{t.resend}</button>
                  <button type="button" onClick={() => { setStage('email'); setError(null); }} className="text-muted hover:text-foreground">{t.changeEmail}</button>
                </div>
              </>
            )}
          </div>

          {/* Right — brand panel with why-join; quote overlaid on the upper photo band (desktop) */}
          <div className="hidden md:flex md:w-1/2 flex-col bg-brand-900 text-white">
            <div className="flex-1 px-8 pt-20 pb-5 flex flex-col">
              <h3 className="text-2xl font-semibold">{t.whyJoinTitle}</h3>
              <ul className="mt-5 flex flex-col gap-3">
                {UI_CONTENT.whyJoin.map((w) => (
                  <li key={w.title} className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-white/25 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                    <span className="text-sm font-medium leading-snug">{w.title}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* Photo band (cropped shorter to keep the popup compact); quote near the top with a top scrim */}
            <div className="relative w-full aspect-[848/330] shrink-0">
              <Image src="/tourists-go-up-hill-sunrise.png" alt="" fill className="object-cover object-center" sizes="(max-width: 896px) 50vw, 448px" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 top-0 px-8 pt-4">
                <p className="text-sm text-white leading-snug font-serif">“{quote.text}”</p>
                {quote.author && <p className="text-[11px] text-white/70 mt-1">{quote.author}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthModal() {
  return (
    <Suspense fallback={null}>
      <AuthModalInner />
    </Suspense>
  );
}
