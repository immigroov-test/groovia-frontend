'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { X, Check, Mail } from 'lucide-react';
import { createClient } from '../lib/supabase/client';
import { Input } from './ui/Input';
import { PasswordInput } from './ui/PasswordInput';
import { PasswordChecklist, passwordMeetsPolicy } from './ui/PasswordChecklist';
import { Button } from './ui/Button';
import { GoogleButton } from './GoogleButton';
import { UI_CONTENT } from '../lib/content';

type Stage = 'email' | 'login' | 'setup' | 'forgot' | 'sent';

function AuthModalInner() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const t = UI_CONTENT.auth;

  const isOpen = params.get('auth') === 'open';
  const mode = params.get('mode');
  const role = params.get('role');
  // Mentor join reuses this whole login flow; it just lands on the mentor onboarding
  // page afterwards (which itself sends already-approved mentors to their hub).
  const next = params.get('next') ?? (role === 'mentor' ? '/mentor/onboarding' : undefined);

  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [sentType, setSentType] = useState<'signup' | 'reset'>('signup');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ text: string; author: string }>({ ...UI_CONTENT.quote });

  // Suppresses the auto-close listener while a user is mid-setup (they're already
  // signed in from the verification link, but must still set a password).
  const settingUp = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(''); setName(''); setPassword(''); setConfirm(''); setAgreed(false); setError(null);
    if (mode === 'setpw') {
      // Returned from the verification link → set a password. Require a real session.
      settingUp.current = true;
      setStage('setup');
      (async () => {
        const { data: { session } } = await createClient().auth.getSession();
        if (!session) {
          settingUp.current = false;
          setStage('email');
          setError('That link expired. Please enter your email again.');
        }
      })();
    } else {
      settingUp.current = false;
      setStage('email');
    }
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/quote')
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => { if (q?.text) setQuote({ text: q.text, author: q.author ?? '' }); })
      .catch(() => {});
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' && !settingUp.current) { close(); router.refresh(); }
    });
    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  function close() {
    const p = new URLSearchParams(params.toString());
    ['auth', 'role', 'mode', 'next', 'guest'].forEach((k) => p.delete(k));
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const cleanEmail = () => email.trim().toLowerCase();

  // Step 1 - email only. Existing account with a password → login. Everyone else →
  // email a verification link (they set a password after clicking it).
  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail() }),
      });
      if (!res.ok) { setLoading(false); setError('Something went wrong. Please try again.'); return; }
      const { has_password } = await res.json();
      if (has_password) { setLoading(false); setStage('login'); return; }
      const { error } = await createClient().auth.signInWithOtp({
        email: cleanEmail(),
        options: { shouldCreateUser: true, emailRedirectTo: signupSetupRedirect() },
      });
      setLoading(false);
      if (error) { setError(error.message); return; }
      setSentType('signup'); setStage('sent');
    } catch {
      setLoading(false); setError('Something went wrong. Please try again.');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({ email: cleanEmail(), password });
    setLoading(false);
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('not confirmed')) { setError(t.notConfirmed); return; }
      if (msg.includes('invalid login')) { setError(t.badCredentials); return; }
      setError(error.message); return;
    }
    // Honour `next` (the page they were headed to, or the mentor onboarding form).
    // Without one, stay on the current page and just refresh to reflect the session.
    if (next) { router.push(next); } else { close(); router.refresh(); }
  }

  // Reached only after the verification link (session exists) → set the password.
  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!passwordMeetsPolicy(password)) { setError('Please meet all the password requirements.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!agreed) { setError('Please agree to the Terms and Privacy Policy.'); return; }
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password, data: { full_name: name.trim() } });
    setLoading(false);
    if (error) { setError(error.message); return; }
    settingUp.current = false;
    close(); router.refresh();
  }

  function signupSetupRedirect(): string {
    const dest = next ?? '/chat';
    const setupNext = dest + (dest.includes('?') ? '&' : '?') + 'auth=open&mode=setpw';
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(setupNext)}`;
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(cleanEmail(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setSentType('reset'); setStage('sent');
  }

  // Re-send whichever email the 'sent' screen is waiting on (link didn't arrive / expired).
  async function resend() {
    setError(null); setLoading(true);
    const supabase = createClient();
    if (sentType === 'signup') {
      await supabase.auth.signInWithOtp({
        email: cleanEmail(),
        options: { shouldCreateUser: true, emailRedirectTo: signupSetupRedirect() },
      });
    } else {
      await supabase.auth.resetPasswordForEmail(cleanEmail(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      });
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  const inputBorder = 'border border-brand-300 focus:border-brand-500';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-900/50 backdrop-blur-sm">
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget && stage !== 'setup') close(); }}
      >
        <div className="relative w-full max-w-4xl bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-up">
          {/* No dismiss during 'setup' - a verified user must finish setting a password. */}
          {stage !== 'setup' && (
            <button
              type="button" onClick={close} aria-label="Close"
              className="absolute top-4 right-4 z-30 p-1.5 rounded-full text-brand-500 hover:text-brand-900 hover:bg-brand-50 md:text-white/80 md:hover:text-white md:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Logo centered across the divider */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 bg-white rounded-full px-5 py-2.5 shadow-md">
            <Image src="/Immigroov_Transparent_Logo.png" alt="Immigroov" width={280} height={60}
              priority className="object-contain" style={{ height: '26px', width: 'auto' }} />
          </div>

          {/* Left - form */}
          <div className="w-full md:w-1/2 px-6 sm:px-9 pt-20 pb-6 flex flex-col md:min-h-[440px]">
            {stage === 'email' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-brand-900 text-center">{t.heading}</h2>
                <p className="text-sm text-muted mt-1 text-center">{t.subheading}</p>
                <form onSubmit={handleEmail} className="mt-6 flex flex-col gap-3">
                  <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder} autoComplete="email" aria-label={t.emailLabel} className={inputBorder} />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading} className="w-full">{t.continue}</Button>
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

            {stage === 'login' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-brand-900 text-center">{t.loginHeading}</h2>
                <p className="text-sm text-muted mt-1 text-center break-all">{email}</p>
                <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-3">
                  <PasswordInput required autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder} autoComplete="current-password" aria-label={t.passwordLabel} className={inputBorder} />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading} className="w-full">{t.signIn}</Button>
                </form>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <button type="button" onClick={() => { setStage('forgot'); setError(null); }} className="text-brand-700 hover:underline">{t.forgot}</button>
                  <button type="button" onClick={() => { setStage('email'); setPassword(''); setError(null); }} className="text-muted hover:text-foreground">{t.back}</button>
                </div>
              </>
            )}

            {stage === 'setup' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-brand-900 text-center">{t.setupHeading}</h2>
                <p className="text-sm text-muted mt-1 text-center">{t.setupSubheading}</p>
                <form onSubmit={handleSetup} className="mt-6 flex flex-col gap-3">
                  <Input type="text" required autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder} autoComplete="name" aria-label={t.nameLabel} className={inputBorder} />
                  <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordLabel} autoComplete="new-password" aria-label={t.passwordLabel} className={inputBorder} />
                  <PasswordChecklist password={password} />
                  <PasswordInput required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder={t.confirmLabel} autoComplete="new-password" aria-label={t.confirmLabel} className={inputBorder} />
                  <label className="flex items-start gap-2 text-[11px] leading-snug text-muted">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-brand-700" />
                    <span>
                      I agree to Immigroov&apos;s{' '}
                      <Link href="/terms" className="underline hover:text-foreground">{t.terms}</Link> and{' '}
                      <Link href="/privacy" className="underline hover:text-foreground">{t.privacy}</Link>.
                    </span>
                  </label>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading}
                    disabled={!passwordMeetsPolicy(password) || password !== confirm || !agreed}
                    className="w-full">{t.createAccount}</Button>
                </form>
              </>
            )}

            {stage === 'forgot' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-brand-900 text-center">{t.forgotHeading}</h2>
                <p className="text-sm text-muted mt-1 text-center">{t.forgotSubheading}</p>
                <form onSubmit={handleForgot} className="mt-6 flex flex-col gap-3">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder} autoComplete="email" aria-label={t.emailLabel} className={inputBorder} />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading} className="w-full">{t.sendReset}</Button>
                </form>
                <button type="button" onClick={() => { setStage('login'); setError(null); }} className="mt-4 text-xs text-muted hover:text-foreground text-center">← Back</button>
              </>
            )}

            {stage === 'sent' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-brand-900">{sentType === 'signup' ? t.confirmHeading : t.resetHeading}</h2>
                <div className="mt-4 h-11 w-11 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
                  <Mail className="h-5 w-5" />
                </div>
                <p className="text-sm text-muted mt-3 leading-relaxed">
                  {sentType === 'signup' ? t.confirmBody(email) : t.resetBody(email)}
                </p>
                <div className="mt-6 flex items-center gap-4 text-xs">
                  <button type="button" onClick={resend} className="text-brand-700 hover:underline disabled:opacity-50" disabled={loading}>{t.resend}</button>
                  <button type="button" onClick={() => { setStage('email'); setError(null); }} className="text-muted hover:text-foreground">{t.changeEmail}</button>
                </div>
              </>
            )}
          </div>

          {/* Right - brand panel with points; quote overlaid on the LOWER part of the photo */}
          <div className="hidden md:flex md:w-1/2 flex-col bg-[#102a4c] text-white">
            <div className="flex-1 px-8 pt-20 pb-5 flex flex-col">
              <h3 className="text-2xl font-semibold">{t.whyJoinTitle}</h3>
              <ul className="mt-5 flex flex-col gap-3">
                {UI_CONTENT.authPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-white/25 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </span>
                    <span className="text-sm font-medium leading-snug">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative w-full aspect-[848/330] shrink-0">
              <Image src="/tourists-go-up-hill-sunrise.png" alt="" fill className="object-cover object-center" sizes="(max-width: 896px) 50vw, 448px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 px-8 pb-4">
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
