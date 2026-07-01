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

type Stage = 'email' | 'sent';

function AuthModalInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = UI_CONTENT.auth;

  const isOpen = params.get('auth') === 'open';
  const next = params.get('next') ?? undefined;

  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ text: string; author: string }>({ ...UI_CONTENT.quote });

  useEffect(() => {
    if (isOpen) { setStage('email'); setEmail(''); setError(null); }
  }, [isOpen]);

  // Daily quote — falls back to the default in content.ts if the API isn't reachable.
  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/quote')
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => { if (q?.text) setQuote({ text: q.text, author: q.author ?? '' }); })
      .catch(() => {});
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

  async function sendLink() {
    const supabase = createClient();
    return supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: redirectTo() },
    });
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const { error } = await sendLink();
    setLoading(false);
    if (error) { setError(error.message); return; }
    setStage('sent');
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
            className="absolute top-4 right-4 z-20 p-1.5 rounded-full text-muted hover:text-foreground hover:bg-black/5"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Left — form */}
          <div className="w-full md:w-1/2 px-7 sm:px-9 py-9 flex flex-col min-h-[520px]">
            <Image
              src="/Immigroov_Transparent_Logo.png" alt="Immigroov" width={280} height={60}
              className="object-contain" style={{ height: '26px', width: 'auto' }}
            />

            <div className="mt-8">
              {stage === 'email' ? (
                <>
                  <h2 className="text-3xl font-semibold tracking-tight text-brand-900">{t.heading}</h2>
                  <p className="text-sm text-muted mt-1">{t.subheading}</p>
                  <form onSubmit={handleEmail} className="mt-6 flex flex-col gap-3">
                    <Input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder} autoComplete="email" aria-label={t.emailLabel}
                    />
                    {error && <p className="text-xs text-red-600">{error}</p>}
                    <Button type="submit" variant="accent" loading={loading} className="w-full">
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
              ) : (
                <>
                  <div className="h-11 w-11 rounded-full bg-accent-50 border border-accent-200 flex items-center justify-center text-accent-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight text-brand-900">{t.linkHeading}</h2>
                  <p className="text-sm text-muted mt-2 leading-relaxed">{t.linkSubheading(email)}</p>
                  <div className="mt-6 flex items-center gap-4 text-xs">
                    <button type="button" onClick={() => sendLink()} className="text-brand-700 hover:underline">{t.resend}</button>
                    <button type="button" onClick={() => { setStage('email'); setError(null); }} className="text-muted hover:text-foreground">{t.changeEmail}</button>
                  </div>
                </>
              )}
            </div>

            {/* Quote */}
            <div className="mt-auto pt-8">
              <p className="text-sm italic text-muted leading-relaxed">“{quote.text}”</p>
              {quote.author && <p className="text-xs text-muted mt-1">— {quote.author}</p>}
            </div>
          </div>

          {/* Right — image background with why-join titles (desktop) */}
          <div className="hidden md:block md:w-1/2 relative">
            <Image src="/tourists-go-up-hill-sunrise.jpg" alt="" fill className="object-cover" sizes="(max-width: 896px) 50vw, 448px" />
            <div className="absolute inset-0 bg-brand-900/70" />
            <div className="relative h-full px-8 py-10 flex flex-col justify-center text-white">
              <h3 className="text-2xl font-semibold">{t.whyJoinTitle}</h3>
              <ul className="mt-6 flex flex-col gap-4">
                {UI_CONTENT.whyJoin.map((w) => (
                  <li key={w.title} className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-accent-500/90 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                    <span className="text-sm font-medium leading-snug">{w.title}</span>
                  </li>
                ))}
              </ul>
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
