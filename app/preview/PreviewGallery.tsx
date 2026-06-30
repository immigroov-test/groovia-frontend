'use client';
import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { MentorCard } from '../../components/MentorCard';
import type { Mentor } from '../../lib/types';
// Real pages/components (faithful + self-updating). Login/signup pages only redirect,
// so those are recreated as static cards below.
import LandingPage from '../(shell)/page';
import { MentorLanding } from '../../components/MentorLanding';
import { MentorRegisterForm } from '../../components/MentorRegisterForm';
import { MentorOnboardingForm } from '../../components/MentorOnboardingForm';
import { MentorAvailabilityForm } from '../../components/MentorAvailabilityForm';
import { ProfileEditor } from '../../components/ProfileEditor';
import { ChatIntro } from '../../components/ChatIntro';

// ── Mock data ────────────────────────────────────────────────────────────────
const mockMentor: Mentor = {
  id: '1', slug: 'maya-singh', display_name: 'Maya Singh',
  headline: 'Ex-Google PM who moved India → Netherlands on a Blue Card',
  bio: 'Six years navigating the Dutch tech market and the IND sponsor system.',
  photo_url: null, expertise_country_codes: ['NL', 'DE', 'SE'],
  expertise_categories: ['job_career', 'visa_pr'], languages: ['English', 'Hindi'],
  professional_domains: ['IT'], years_lived_experience: 6,
};
const mockMentors: Mentor[] = [
  mockMentor,
  { ...mockMentor, id: '2', slug: 'lars-jansen', display_name: 'Lars Jansen',
    headline: 'Relocation & housing in Amsterdam for new arrivals',
    expertise_country_codes: ['NL'], expertise_categories: ['life_settling'] },
  { ...mockMentor, id: '3', slug: 'priya-mehta', display_name: 'Priya Mehta',
    headline: 'Study-abroad & student visa guidance for the EU',
    expertise_country_codes: ['DE', 'FR'], expertise_categories: ['study_abroad'] },
];

function PageWrap({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">{children}</div>;
}
function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="p-8 flex justify-center">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl px-6 sm:px-7 pt-7 pb-6">{children}</div>
    </div>
  );
}
function GoogleButtonMock() {
  return (
    <Button variant="outline" className="w-full">
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
        <path fill="#EA4335" d="M12 5c1.6 0 3.1.6 4.2 1.6l3.2-3.1C17.4 1.6 14.9.5 12 .5 7.4.5 3.4 3.1 1.4 6.9l3.7 2.9C6 7 8.8 5 12 5z" />
        <path fill="#4285F4" d="M23.5 12.2c0-.9-.1-1.7-.3-2.5H12v4.7h6.5c-.3 1.5-1.1 2.7-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z" />
        <path fill="#FBBC05" d="M5.1 14.2c-.3-.8-.4-1.6-.4-2.2 0-.6.1-1.4.4-2.2L1.4 6.9C.5 8.5 0 10.2 0 12s.5 3.5 1.4 5.1l3.7-2.9z" />
        <path fill="#34A853" d="M12 23.5c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-6-2-7-4.7L1.4 17c2 3.8 6 6.5 10.6 6.5z" />
      </svg>
      Continue with Google
    </Button>
  );
}

// ── Previews, organized by user flow ─────────────────────────────────────────
export const PREVIEWS: { group: string; title: string; real?: boolean; node: ReactNode }[] = [
  // 1. DISCOVER (public) -----------------------------------------------------
  { group: '1 · Discover', title: 'Landing page', real: true, node: <LandingPage /> },
  {
    group: '1 · Discover', title: 'Browse mentors', node: (
      <PageWrap>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 mb-6">Find a mentor</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockMentors.map((m) => <MentorCard key={m.id} mentor={m} />)}
        </div>
      </PageWrap>
    ),
  },
  {
    group: '1 · Discover', title: 'Mentor profile', node: (
      <PageWrap>
        <div className="flex flex-col gap-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-xl font-semibold text-brand-700">MS</div>
            <div>
              <h1 className="text-2xl font-semibold text-brand-900">Maya Singh</h1>
              <p className="text-sm text-muted">{mockMentor.headline}</p>
              <div className="flex gap-1.5 mt-2">
                {mockMentor.expertise_country_codes.map((c) => <Badge key={c} tone="brand">{c}</Badge>)}
              </div>
            </div>
          </div>
          <Card><CardBody className="pt-6"><h2 className="text-base font-semibold text-foreground mb-2">About</h2><p className="text-sm text-muted">{mockMentor.bio}</p></CardBody></Card>
          <Card><CardBody className="pt-6 flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Book a session</h2>
            <div className="rounded-lg border border-[--color-border] p-4 flex items-center justify-between">
              <div><p className="text-sm font-medium text-foreground">Visa & PR guidance</p><p className="text-xs text-muted">60 min · €60</p></div>
              <Button size="sm">Select</Button>
            </div>
          </CardBody></Card>
        </div>
      </PageWrap>
    ),
  },
  { group: '1 · Discover', title: 'Privacy policy', node: (
      <PageWrap><h1 className="text-3xl font-semibold text-brand-900 mb-4">Privacy Policy</h1><p className="text-sm text-muted">Static legal text page. View the real content at <code>/privacy</code> — it renders normally without auth, so it&apos;s not mocked here.</p></PageWrap>
    ) },
  { group: '1 · Discover', title: 'Terms', node: (
      <PageWrap><h1 className="text-3xl font-semibold text-brand-900 mb-4">Terms &amp; Conditions</h1><p className="text-sm text-muted">Static legal text page. View the real content at <code>/terms</code>.</p></PageWrap>
    ) },

  // 2. SIGN UP & LOGIN -------------------------------------------------------
  {
    group: '2 · Sign up & login', title: 'Sign up', node: (
      <AuthCard>
        <div className="text-center mb-5">
          <h2 className="text-2xl font-semibold tracking-tight text-brand-900">Create your account</h2>
          <p className="text-sm mt-1 font-semibold text-emerald-600">Free to start. No card required.</p>
        </div>
        <GoogleButtonMock />
        <div className="my-4 flex items-center gap-3 text-xs text-muted"><div className="h-px flex-1 bg-[--color-border]" /><span>or with email</span><div className="h-px flex-1 bg-[--color-border]" /></div>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3"><Input label="First name" /><Input label="Last name" /></div>
          <Input label="Email" type="email" /><Input label="Password" type="password" hint="At least 8 characters." /><Input label="Confirm password" type="password" />
          <Button>Create account</Button>
        </div>
      </AuthCard>
    ),
  },
  {
    group: '2 · Sign up & login', title: 'Login', node: (
      <AuthCard>
        <div className="text-center mb-5"><h2 className="text-2xl font-semibold tracking-tight text-brand-900">Welcome back</h2><p className="text-sm mt-1 text-muted">Login to continue your journey.</p></div>
        <GoogleButtonMock />
        <div className="my-4 flex items-center gap-3 text-xs text-muted"><div className="h-px flex-1 bg-[--color-border]" /><span>or with email</span><div className="h-px flex-1 bg-[--color-border]" /></div>
        <div className="flex flex-col gap-3"><Input label="Email" type="email" /><Input label="Password" type="password" /><Button>Login</Button><button className="text-xs text-muted text-center hover:text-foreground">Forgot password?</button></div>
      </AuthCard>
    ),
  },
  {
    group: '2 · Sign up & login', title: 'Verify email', node: (
      <AuthCard>
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-brand-900">Verify your email</h2>
          <p className="text-sm text-muted">A verification link was sent to <b className="text-foreground">maya@example.com</b>. Click it to confirm your account.</p>
          <p className="text-xs text-muted">Don&apos;t see it? Check your spam folder.</p>
          <button className="text-sm text-brand-700 hover:underline text-left">Resend verification email</button>
        </div>
      </AuthCard>
    ),
  },
  {
    group: '2 · Sign up & login', title: 'Forgot password', node: (
      <AuthCard>
        <div className="text-center mb-2"><h2 className="text-2xl font-semibold tracking-tight text-brand-900">Forgot password?</h2><p className="text-sm text-muted mt-1">We&apos;ll email you a reset link.</p></div>
        <div className="flex flex-col gap-3 mt-3"><Input label="Email" type="email" /><Button>Send reset link</Button></div>
      </AuthCard>
    ),
  },
  {
    group: '2 · Sign up & login', title: 'Reset password', node: (
      <AuthCard>
        <div className="text-center mb-2"><h2 className="text-2xl font-semibold tracking-tight text-brand-900">Set a new password</h2></div>
        <div className="flex flex-col gap-3 mt-3"><Input label="New password" type="password" hint="At least 8 characters." /><Input label="Confirm password" type="password" /><Button>Update password</Button></div>
      </AuthCard>
    ),
  },

  // 3. BECOME A MENTOR (flow order) ------------------------------------------
  {
    group: '3 · Become a mentor', title: '① Become a mentor', real: true, node: (
      <PageWrap>
        <div className="text-center mb-12"><h1 className="text-4xl font-bold tracking-tight text-brand-900">Become a mentor</h1><p className="text-base text-muted mt-2">Help immigrants navigate their career journey.</p></div>
        <MentorLanding />
      </PageWrap>
    ),
  },
  {
    group: '3 · Become a mentor', title: '② Register', real: true, node: (
      <div className="mx-auto max-w-md px-4 py-10"><h1 className="text-2xl font-semibold text-brand-900 mb-6 text-center">Join as a mentor</h1><MentorRegisterForm /></div>
    ),
  },
  {
    group: '3 · Become a mentor', title: '③ Onboarding — details', real: true, node: (
      <PageWrap><h1 className="text-2xl font-semibold text-brand-900 mb-6">Set up your mentor profile</h1><MentorOnboardingForm defaultName="Maya Singh" userId="mock" /></PageWrap>
    ),
  },
  {
    group: '3 · Become a mentor', title: '④ Set availability', real: true, node: (
      <PageWrap><h1 className="text-2xl font-semibold text-brand-900 mb-6">Your availability</h1><MentorAvailabilityForm initialSlots={[]} initialDuration={60} /></PageWrap>
    ),
  },
  {
    group: '3 · Become a mentor', title: '⑤ Hub — pending review', node: (
      <PageWrap>
        <div><h1 className="text-3xl font-semibold tracking-tight text-brand-900">Mentor Hub</h1><p className="text-sm text-muted mt-1">Welcome back, Maya Singh.</p></div>
        <div className="mt-8 flex flex-col gap-4">
          <Card><CardBody className="pt-6"><h2 className="text-base font-semibold text-foreground">Application under review</h2><p className="text-sm text-muted mt-1">Thanks for applying. Our team is reviewing your profile — this usually takes 1–2 business days.</p></CardBody></Card>
          <div className="flex gap-2"><Button>Set availability</Button><Button variant="outline">Edit profile</Button></div>
        </div>
      </PageWrap>
    ),
  },
  {
    group: '3 · Become a mentor', title: '⑥ Hub — approved', node: (
      <PageWrap>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div><h1 className="text-3xl font-semibold tracking-tight text-brand-900">Mentor Hub</h1><p className="text-sm text-muted mt-1">Welcome back, Maya Singh.</p></div>
          <div className="flex gap-2 shrink-0"><Button variant="outline" size="sm">Edit profile</Button><Button variant="outline" size="sm">Set availability</Button></div>
        </div>
        <div className="mt-8 flex flex-col gap-4">
          <Card><CardBody className="pt-6"><h2 className="text-base font-semibold text-foreground">Your profile is live</h2><p className="text-sm text-muted mt-1">Mentees can discover you on the platform. <span className="text-brand-700">View public profile →</span></p></CardBody></Card>
          <Card><CardBody className="pt-6 flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Your sessions</h2>
            <div className="rounded-lg border border-[--color-border] p-4 flex items-center justify-between"><div><p className="text-sm font-medium text-foreground">Aditya Rao · Visa & PR guidance</p><p className="text-xs text-muted mt-0.5">Tomorrow, 15:00–16:00 (CET)</p></div><Badge tone="success">Confirmed</Badge></div>
          </CardBody></Card>
        </div>
      </PageWrap>
    ),
  },
  {
    group: '3 · Become a mentor', title: '⑦ Hub — rejected', node: (
      <PageWrap>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Mentor Hub</h1>
        <div className="mt-8"><Card><CardBody className="pt-6"><h2 className="text-base font-semibold text-foreground">Application not approved</h2><p className="text-sm text-muted mt-1">Your mentor application wasn&apos;t approved this time. You can update your profile and re-apply, or contact support.</p></CardBody></Card></div>
      </PageWrap>
    ),
  },

  // 4. CANDIDATE -------------------------------------------------------------
  {
    group: '4 · Candidate', title: 'Chat — intro', real: true, node: (
      <div className="mx-auto max-w-2xl px-4 py-10"><ChatIntro onStart={() => {}} /></div>
    ),
  },
  {
    group: '4 · Candidate', title: 'Account — profile', real: true, node: (
      <PageWrap><h1 className="text-2xl font-semibold text-brand-900 mb-6">Your account</h1><ProfileEditor userId="mock" initialFullName="Maya Singh" initialPhone="+31 6 1234 5678" initialSummary="Product manager relocating to the Netherlands." /></PageWrap>
    ),
  },

  // 5. BOOK A MENTOR ---------------------------------------------------------
  {
    group: '5 · Book a mentor', title: 'Confirmation', node: (
      <PageWrap>
        <div className="max-w-md mx-auto"><Card><CardBody className="pt-8 pb-6 text-center flex flex-col gap-3">
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-xl">✓</div>
          <h2 className="text-xl font-semibold text-brand-900">Booking confirmed</h2>
          <p className="text-sm text-muted">Your session with <b className="text-foreground">Maya Singh</b> is booked.</p>
          <div className="rounded-lg border border-[--color-border] p-4 text-left text-sm flex flex-col gap-1 mt-2">
            <div className="flex justify-between"><span className="text-muted">When</span><span className="text-foreground">Tue 12 May, 15:00 CET</span></div>
            <div className="flex justify-between"><span className="text-muted">Service</span><span className="text-foreground">Visa & PR guidance (60 min)</span></div>
            <div className="flex justify-between"><span className="text-muted">Ref</span><span className="text-foreground">IMG-8F3A1</span></div>
          </div>
          <Button className="mt-2">Join Google Meet</Button>
        </CardBody></Card></div>
      </PageWrap>
    ),
  },
  {
    group: '5 · Book a mentor', title: 'Manage booking', node: (
      <PageWrap>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 mb-6">Your bookings</h1>
        <Card><CardBody className="pt-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-foreground">Maya Singh · Visa & PR guidance</p><p className="text-xs text-muted mt-0.5">Tue 12 May, 15:00 CET · 60 min</p></div><Badge tone="success">Confirmed</Badge></div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline">Reschedule</Button><Button size="sm" variant="outline">Cancel</Button><Button size="sm" variant="ghost">Report no-show</Button></div>
        </CardBody></Card>
      </PageWrap>
    ),
  },

  // 6. ADMIN -----------------------------------------------------------------
  {
    group: '6 · Admin', title: 'Approval queue', node: (
      <PageWrap>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 mb-1">Mentor approvals</h1>
        <p className="text-sm text-muted mb-6">2 applications awaiting review.</p>
        <div className="flex flex-col gap-3">
          {[mockMentors[0], mockMentors[2]].map((m) => (
            <Card key={m.id}><CardBody className="pt-6 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2"><h3 className="font-semibold text-brand-900">{m.display_name}</h3><Badge tone="warning">Pending</Badge></div>
                <p className="text-sm text-muted mt-1">{m.headline}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">{m.expertise_country_codes.map((c) => <Badge key={c} tone="brand">{c}</Badge>)}</div>
              </div>
              <div className="flex gap-2 shrink-0"><Button size="sm" variant="accent">Approve</Button><Button size="sm" variant="outline">Reject</Button></div>
            </CardBody></Card>
          ))}
        </div>
      </PageWrap>
    ),
  },

  // 7. DESIGN SYSTEM ---------------------------------------------------------
  {
    group: '7 · Design system', title: 'Buttons', node: (
      <div className="p-8 flex flex-col gap-6">
        <div className="flex flex-wrap gap-3 items-center"><Button variant="primary">Primary</Button><Button variant="accent">Accent</Button><Button variant="secondary">Secondary</Button><Button variant="outline">Outline</Button><Button variant="ghost">Ghost</Button></div>
        <div className="flex flex-wrap gap-3 items-center"><Button size="sm">Small</Button><Button size="md">Medium</Button><Button size="lg">Large</Button><Button loading>Loading</Button><Button disabled>Disabled</Button></div>
      </div>
    ),
  },
  {
    group: '7 · Design system', title: 'Badges', node: (
      <div className="p-8 flex flex-wrap gap-2"><Badge tone="brand">Brand</Badge><Badge tone="accent">Accent</Badge><Badge tone="neutral">Neutral</Badge><Badge tone="success">Approved</Badge><Badge tone="warning">Pending</Badge></div>
    ),
  },
  {
    group: '7 · Design system', title: 'Inputs', node: (
      <div className="p-8 max-w-sm flex flex-col gap-4">
        <Input label="Email" type="email" placeholder="you@example.com" /><Input label="Password" type="password" hint="At least 8 characters." /><Input label="Full name" defaultValue="Maya Singh" /><Input label="Email" type="email" defaultValue="bad@" error="That email looks invalid." />
      </div>
    ),
  },
];

const GROUPS = [...new Set(PREVIEWS.map((p) => p.group))];

export function PreviewGallery() {
  const [active, setActive] = useState(0);
  const [mobile, setMobile] = useState(false);
  const current = PREVIEWS[active];

  return (
    <div className="min-h-screen flex bg-slate-50 text-foreground">
      <aside className="w-64 shrink-0 border-r border-[--color-border] bg-white h-screen sticky top-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-[--color-border]">
          <p className="text-sm font-semibold text-brand-900">Page preview</p>
          <p className="text-[11px] text-muted mt-0.5">Mock data · no login · design only</p>
        </div>
        <nav className="p-2">
          {GROUPS.map((g) => (
            <div key={g} className="mb-2">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{g}</p>
              {PREVIEWS.map((p, i) => p.group === g && (
                <button key={p.title} onClick={() => setActive(i)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center justify-between gap-2 transition-colors ${active === i ? 'bg-brand-900 text-white' : 'text-brand-800 hover:bg-brand-50'}`}>
                  <span>{p.title}</span>
                  {p.real && <span className={`text-[9px] uppercase tracking-wide rounded px-1 ${active === i ? 'bg-white/20' : 'bg-emerald-50 text-emerald-600'}`}>live</span>}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col">
        <div className="h-12 shrink-0 border-b border-[--color-border] bg-white flex items-center justify-between px-4">
          <span className="text-sm font-medium text-brand-900">{current.group} / {current.title}{current.real && <span className="ml-2 text-[11px] text-emerald-600">· real component</span>}</span>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
            <button onClick={() => setMobile(false)} className={`px-2.5 py-1 rounded-md ${!mobile ? 'bg-white shadow-sm font-medium' : 'text-muted'}`}>Desktop</button>
            <button onClick={() => setMobile(true)} className={`px-2.5 py-1 rounded-md ${mobile ? 'bg-white shadow-sm font-medium' : 'text-muted'}`}>Mobile</button>
          </div>
        </div>
        {/* Rendered in an iframe so CSS media queries (sm:/md:/lg:) respond to the
            frame width — i.e. "Mobile" is a TRUE mobile viewport, not a shrunken box. */}
        <div className="flex-1 min-h-0 p-6 flex justify-center bg-slate-100">
          <iframe
            key={`${active}-${mobile ? 'm' : 'd'}`}
            src={`/preview/frame?i=${active}`}
            title="preview"
            className={`h-full rounded-xl border border-[--color-border] bg-background shadow-sm ${mobile ? 'w-[390px]' : 'w-full max-w-5xl'}`}
          />
        </div>
      </main>
    </div>
  );
}
