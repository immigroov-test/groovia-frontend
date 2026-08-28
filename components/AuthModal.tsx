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
import { randomQuote } from '../lib/quotes';
import { TypeText } from './TypeText';

type Stage = 'email' | 'login' | 'oauth' | 'setup' | 'forgot' | 'sent';

const ENTRY_CONSENT_KEY = 'ig_entry_consent';

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
  // BUG-067: `new=1` tells the onboarding page this really is a fresh mentor signup, so it shows the
  // form. An already-signed-in customer arrives without it and is routed to Contact instead.
  const next = params.get('next') ?? (role === 'mentor' ? '/mentor/onboarding?new=1' : undefined);
  // Booking flow prefills the email so the guest just sets a password after verifying.
  const emailParam = params.get('email');

  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [agreed, setAgreed] = useState(false);
  // Consent at the FIRST step, gating both routes in. Separate from `agreed` above, which
  // is the signup step's own checkbox: someone signing IN never reaches that step, so
  // relying on it would take consent from new accounts only.
  const [entryAgreed, setEntryAgreed] = useState(false);
  const [entryConsentError, setEntryConsentError] = useState<string | null>(null);
  const [marketing, setMarketing] = useState(false);
  const [sentType, setSentType] = useState<'signup' | 'reset'>('signup');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<{ text: string; author: string }>({ ...UI_CONTENT.quote });
  // The author line only appears once the quote has finished typing.
  const [quoteDone, setQuoteDone] = useState(false);
  useEffect(() => { setQuoteDone(false); }, [quote.text]);

  // Suppresses the auto-close listener while a user is mid-setup (they're already
  // signed in from the verification link, but must still set a password).
  const settingUp = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    setEmail(emailParam ?? ''); setFirstName(''); setLastName(''); setPassword(''); setConfirm(''); setAgreed(false); setMarketing(false); setError(null);
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
  }, [isOpen, mode, emailParam]);

  // A fresh random quote each time the popup opens, then rotate every 10s while open.
  useEffect(() => {
    if (!isOpen) return;
    setQuote(randomQuote());
    const id = setInterval(() => setQuote(randomQuote()), 10000);
    return () => clearInterval(id);
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
    ['auth', 'role', 'mode', 'next', 'guest', 'reason', 'email'].forEach((k) => p.delete(k));
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const cleanEmail = () => email.trim().toLowerCase();

  // Step 1 - email only. Existing account with a password → login. Everyone else →
  // email a verification link (they set a password after clicking it).
  /** Both ways in are gated on the same checkbox. Returns false and shows why when it is
   *  unticked, rather than disabling the controls: a dead button explains nothing to the
   *  person who has not spotted the checkbox yet. */
  function requireEntryConsent(): boolean {
    if (entryAgreed) {
      // Google takes the user off-site and back to /auth/callback, where this component no
      // longer exists. The marker is what lets the callback record the same agreement.
      try { sessionStorage.setItem(ENTRY_CONSENT_KEY, '1'); } catch { /* private mode */ }
      return true;
    }
    setEntryConsentError('Please accept the Terms of Use and Privacy Policy to continue.');
    return false;
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!requireEntryConsent()) return;
    setError(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/check-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail() }),
      });
      if (!res.ok) { setLoading(false); setError('Something went wrong. Please try again.'); return; }
      const data = await res.json();
      if (data.has_password) { setLoading(false); setStage('login'); return; }
      // Account exists via Google with no password → guide them to Google instead of
      // emailing a link (which would let them accidentally add a password).
      if (data.oauth_only) { setLoading(false); setStage('oauth'); return; }
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
    // Sync the account (links a migrated mentor by email on first login). A mentor who hasn't
    // finished first-login onboarding is sent straight to /mentor, where the mandatory welcome
    // popup fires - regardless of which page they logged in from. Best-effort: if the sync call
    // fails, fall through to the normal navigation (the /mentor hub still enforces the gate).
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (session?.access_token) {
        const res = await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          // The entry checkbox was ticked to get here, so this sign-in is a consent event.
          // The backend skips it when a live record already exists, and records it when a
          // newer version of the policies has been published since.
          body: JSON.stringify({ accepted_terms: true, consent_context: 'signin' }),
        });
        const d = await res.json().catch(() => ({}));
        if (d?.role === 'mentor' && d?.needs_onboarding) { router.push('/mentor'); return; }
      }
    } catch { /* best-effort */ }
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
    if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name.'); return; }
    setLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { error } = await createClient().auth.updateUser({
      password,
      data: { full_name: fullName, first_name: firstName.trim(), last_name: lastName.trim() },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    // Push the name into the profiles row (the signup trigger left it null) and
    // link any guest bookings this email made before signing up. Non-fatal.
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (session?.access_token) {
        await fetch('/api/auth/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          // accepted_terms/marketing_consent only ever come from THIS one-time call -
          // it's what tells the backend to actually record signup consent, rather than
          // a routine sync (handleLogin's call above sends neither).
          body: JSON.stringify({ full_name: fullName, accepted_terms: agreed, marketing_consent: marketing }),
        });
      }
    } catch { /* best-effort */ }
    settingUp.current = false;
    close(); router.refresh();
  }

  function signupSetupRedirect(): string {
    const dest = next ?? '/home';
    const setupNext = dest + (dest.includes('?') ? '&' : '?') + 'auth=open&mode=setpw';
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(setupNext)}`;
  }

  async function handleForgot(e?: React.FormEvent) {
    e?.preventDefault();
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
  // Primary CTA in navy (#102a4c) so the left half mirrors the right: dark-blue text +
  // buttons on white, opposite the right's white text on dark-blue.
  const primaryBtn = 'w-full bg-[#102a4c] text-white hover:bg-[#1b3f6e] active:bg-[#0c1830]';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-brand-900/50 backdrop-blur-sm">
      <div
        className="flex min-h-full items-start md:items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget && stage !== 'setup') close(); }}
      >
        <div className="relative w-[92vw] max-w-6xl md:h-[90vh] md:max-h-[880px] bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row animate-fade-up">
          {/* No dismiss during 'setup' - a verified user must finish setting a password. */}
          {stage !== 'setup' && (
            <button
              type="button" onClick={close} aria-label="Close"
              className="absolute top-4 right-4 z-30 p-1.5 rounded-full text-brand-500 hover:text-brand-900 hover:bg-brand-50 md:text-white/80 md:hover:text-white md:hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Desktop: logo centered across the vertical divider at the top. */}
          <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 hidden md:block bg-white rounded-full px-5 py-2.5 shadow-md">
            <Image src="/Immigroov_Transparent_Logo.png" alt="Immigroov" width={280} height={60}
              priority className="object-contain" style={{ height: '26px', width: 'auto' }} />
          </div>

          {/* Left - form over a background image. object-cover makes the image fill the
              whole left half at any popup/screen size (responsive, no gaps, never distorts;
              it crops only whatever overflows). object-bottom keeps the skyline anchored to
              the base. WASH knob: bg-white/0 = image at full strength; raise to /30, /60...
              if the form text ever needs more contrast. */}
          <div className="relative w-full md:w-1/2 flex flex-col md:h-full overflow-hidden bg-white">
            <Image src="/login_left_bg.png" alt="" fill priority className="object-cover object-bottom" sizes="(max-width: 767px) 92vw, 576px" />
            <div className="absolute inset-0 bg-white/0" />
            <div className="relative z-10 px-6 sm:px-9 pt-12 md:pt-20 pb-24 md:pb-6 flex flex-col md:h-full overflow-y-auto">
            {stage === 'email' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#102a4c] text-center">{t.heading}</h2>
                <p className="text-base text-muted mt-1 text-center">{t.subheading}</p>
                <form onSubmit={handleEmail} className="mt-6 flex flex-col gap-3">
                  <Input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder} autoComplete="email" aria-label={t.emailLabel} className={inputBorder} />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading} className={primaryBtn}>{t.continue}</Button>
                </form>
                <div className="my-4 flex items-center gap-3 text-sm text-muted">
                  <div className="h-px flex-1 bg-[--color-border]" /><span>{t.orDivider}</span><div className="h-px flex-1 bg-[--color-border]" />
                </div>
                <GoogleButton label={t.continueWithGoogle} next={next} beforeSignIn={requireEntryConsent} />
                {/* An actual checkbox, not the old "by continuing you agree" line. Implied
                    consent from the act of signing in is not consent anyone can evidence
                    later; a ticked box with a timestamp is. */}
                <label className="mt-4 flex items-start gap-2 text-xs leading-snug text-muted cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={entryAgreed}
                    onChange={(e) => { setEntryAgreed(e.target.checked); if (e.target.checked) setEntryConsentError(null); }}
                    className="mt-0.5 accent-brand-700"
                    aria-describedby={entryConsentError ? 'entry-consent-error' : undefined}
                  />
                  <span>
                    I agree to the{' '}
                    <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms &amp; Policies</Link>.
                  </span>
                </label>
                {entryConsentError && (
                  <p id="entry-consent-error" role="alert" className="mt-2 text-xs text-red-600">
                    {entryConsentError}
                  </p>
                )}
              </>
            )}

            {stage === 'login' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#102a4c] text-center">{t.loginHeading}</h2>
                <p className="text-base text-muted mt-1 text-center break-all">{email}</p>
                <form onSubmit={handleLogin} className="mt-6 flex flex-col gap-3">
                  <PasswordInput required autoFocus value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder} autoComplete="current-password" aria-label={t.passwordLabel} className={inputBorder} />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading} className={primaryBtn}>{t.signIn}</Button>
                </form>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <button type="button" onClick={() => { setStage('forgot'); setError(null); }} className="text-brand-700 hover:underline">{t.forgot}</button>
                  <button type="button" onClick={() => { setStage('email'); setPassword(''); setError(null); }} className="text-muted hover:text-foreground">{t.back}</button>
                </div>
              </>
            )}

            {stage === 'oauth' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#102a4c] text-center">This account uses Google</h2>
                <p className="text-base text-muted mt-1 text-center break-all">{email}</p>
                <p className="text-sm text-muted mt-3 text-center leading-relaxed">
                  You created this account with Google, so there&apos;s no password. Continue with Google to sign in.
                </p>
                <div className="mt-6">
                  <GoogleButton label="Continue with Google" next={next} />
                </div>
                {error && <p className="mt-3 text-xs text-red-600 text-center">{error}</p>}
                <div className="mt-5 flex flex-col items-center gap-2 text-sm">
                  <button type="button" onClick={() => handleForgot()} disabled={loading}
                    className="text-brand-700 hover:underline disabled:opacity-50">
                    Prefer a password? Set one by email
                  </button>
                  <button type="button" onClick={() => { setStage('email'); setPassword(''); setError(null); }}
                    className="text-muted hover:text-foreground">Use a different email</button>
                </div>
              </>
            )}

            {stage === 'setup' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#102a4c] text-center">{t.setupHeading}</h2>
                <p className="text-base text-muted mt-1 text-center">{t.setupSubheading}</p>
                <form onSubmit={handleSetup} className="mt-6 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <Input type="text" required autoFocus value={firstName} maxLength={50} onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name" autoComplete="given-name" aria-label="First name" className={inputBorder} />
                    </div>
                    <div className="flex-1">
                      <Input type="text" required value={lastName} maxLength={50} onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name" autoComplete="family-name" aria-label="Last name" className={inputBorder} />
                    </div>
                  </div>
                  <PasswordInput required value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordLabel} autoComplete="new-password" aria-label={t.passwordLabel} className={inputBorder} />
                  <PasswordChecklist password={password} />
                  <PasswordInput required value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    placeholder={t.confirmLabel} autoComplete="new-password" aria-label={t.confirmLabel} className={inputBorder} />
                  <label className="flex items-start gap-2 text-xs leading-snug text-muted">
                    <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 accent-brand-700" />
                    <span>
                      I agree to the{' '}
                      <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms &amp; Policies</Link>.
                    </span>
                  </label>
                  {/* Separate and unbundled from the checkbox above, per spec: marketing consent
                      cannot be forced as part of accepting the Terms. Unchecked by default. */}
                  <label className="flex items-start gap-2 text-xs leading-snug text-muted">
                    <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 accent-brand-700" />
                    <span>(optional) Send me updates and offers from Immigroov</span>
                  </label>
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading}
                    disabled={!passwordMeetsPolicy(password) || password !== confirm || !agreed}
                    className={primaryBtn}>{t.createAccount}</Button>
                </form>
              </>
            )}

            {stage === 'forgot' && (
              <>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#102a4c] text-center">{t.forgotHeading}</h2>
                <p className="text-base text-muted mt-1 text-center">{t.forgotSubheading}</p>
                <form onSubmit={handleForgot} className="mt-6 flex flex-col gap-3">
                  <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder} autoComplete="email" aria-label={t.emailLabel} className={inputBorder} />
                  {error && <p className="text-xs text-red-600">{error}</p>}
                  <Button type="submit" loading={loading} className={primaryBtn}>{t.sendReset}</Button>
                </form>
                <button type="button" onClick={() => { setStage('login'); setError(null); }} className="mt-4 text-sm text-muted hover:text-foreground text-center">← Back</button>
              </>
            )}

            {stage === 'sent' && (
              <div className="flex flex-col items-center text-center">
                <div className="h-16 w-16 rounded-full bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-700">
                  <Mail className="h-8 w-8" />
                </div>
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#102a4c] mt-5">{sentType === 'signup' ? t.confirmHeading : t.resetHeading}</h2>
                <p className="text-base text-muted mt-2 leading-relaxed">
                  {sentType === 'signup' ? t.confirmBody(email) : t.resetBody(email)}
                </p>
                <div className="mt-6 flex items-center gap-4 text-sm">
                  <button type="button" onClick={resend} className="text-brand-700 hover:underline disabled:opacity-50" disabled={loading}>{t.resend}</button>
                  <button type="button" onClick={() => { setStage('email'); setError(null); }} className="text-muted hover:text-foreground">{t.changeEmail}</button>
                </div>
              </div>
            )}
            </div>
          </div>

          {/* Mobile only: logo pill centered exactly on the seam between the stacked form
              (top) and the why-join panel (bottom) - it straddles the boundary, half over
              each, mirroring the desktop logo on the vertical divider. h-0 puts the flex line
              on the seam; items-center centers the pill on it. */}
          <div className="md:hidden relative z-30 flex h-0 items-center justify-center">
            <div className="bg-white rounded-full px-5 py-2.5 shadow-md">
              <Image src="/Immigroov_Transparent_Logo.png" alt="Immigroov" width={280} height={60}
                className="object-contain" style={{ height: '26px', width: 'auto' }} />
            </div>
          </div>

          {/* Right - background image (navy scrim for readable white text); bullet points at
              the top, quote at the bottom. On desktop it's the right half; on a narrow screen
              it stacks below the form so the popup reads top-to-bottom. */}
          <div className="relative flex w-full md:w-1/2 md:h-full flex-col text-white bg-[#102a4c] overflow-hidden">
            {/* object-cover: fills the whole right column at any popup size (industry standard for
                a side/hero panel), scales responsively, never distorts, crops only the overflow. */}
            <Image src="/login-bg.jpg" alt="" fill priority className="object-cover object-center" sizes="(max-width: 896px) 50vw, 576px" />
            {/* Light scrim: shows the true image through the middle, darker only at the top
                (bullets) and bottom (quote) so the white text stays legible. Raise the /NN
                values for more contrast, lower them to reveal more of the image. */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a1e3a]/50 via-[#0a1e3a]/10 to-[#0a1e3a]/70" />

            <div className="relative flex-1 px-8 pt-8 md:pt-20 pb-5 flex flex-col">
              <h3 className="text-xl sm:text-2xl font-semibold text-center">{t.whyJoinTitle}</h3>
              <ul className="mt-6 flex flex-col gap-3.5">
                {UI_CONTENT.authPoints.map((point) => (
                  <li key={point} className="flex items-start gap-3">
                    <span className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-accent-500 flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" strokeWidth={3} />
                    </span>
                    <span className="text-base font-medium leading-snug">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative px-8 pb-5">
              <p className="text-xs text-white/80 leading-snug font-serif font-normal italic min-h-[2.4em]">
                “<TypeText key={quote.text} text={quote.text} active={isOpen} speed={38} onDone={() => setQuoteDone(true)} />”
              </p>
              {quote.author && quoteDone && (
                <p className="text-[11px] text-white/60 mt-1 not-italic animate-fade-up">{quote.author}</p>
              )}
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
