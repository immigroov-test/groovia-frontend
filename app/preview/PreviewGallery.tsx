'use client';
import { useState, type ReactNode } from 'react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { MentorCard } from '../../components/MentorCard';
import type { Mentor } from '../../lib/types';

// ── Mock data ────────────────────────────────────────────────────────────────
const mockMentor: Mentor = {
  id: '1',
  slug: 'maya-singh',
  display_name: 'Maya Singh',
  headline: 'Ex-Google PM who moved India → Netherlands on a Blue Card',
  bio: 'Six years navigating the Dutch tech market and the IND sponsor system.',
  photo_url: null,
  expertise_country_codes: ['NL', 'DE', 'SE'],
  expertise_categories: ['job_career', 'visa_pr'],
  languages: ['English', 'Hindi'],
  professional_domains: ['IT'],
  years_lived_experience: 6,
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

// ── Small helpers to mirror real page chrome ─────────────────────────────────
function PageWrap({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">{children}</div>;
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

// ── The previews ─────────────────────────────────────────────────────────────
const PREVIEWS: { group: string; title: string; node: ReactNode }[] = [
  // Design system ------------------------------------------------------------
  {
    group: 'Design system', title: 'Buttons',
    node: (
      <div className="p-8 flex flex-col gap-6">
        <div className="flex flex-wrap gap-3 items-center">
          <Button variant="primary">Primary</Button>
          <Button variant="accent">Accent</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
        </div>
      </div>
    ),
  },
  {
    group: 'Design system', title: 'Badges',
    node: (
      <div className="p-8 flex flex-wrap gap-2">
        <Badge tone="brand">Brand</Badge>
        <Badge tone="accent">Accent</Badge>
        <Badge tone="neutral">Neutral</Badge>
        <Badge tone="success">Approved</Badge>
        <Badge tone="warning">Pending</Badge>
      </div>
    ),
  },
  {
    group: 'Design system', title: 'Inputs',
    node: (
      <div className="p-8 max-w-sm flex flex-col gap-4">
        <Input label="Email" type="email" placeholder="you@example.com" />
        <Input label="Password" type="password" hint="At least 8 characters." />
        <Input label="Full name" defaultValue="Maya Singh" />
        <Input label="Email" type="email" defaultValue="bad@" error="That email looks invalid." />
      </div>
    ),
  },
  {
    group: 'Design system', title: 'Cards',
    node: (
      <div className="p-8 grid gap-4 sm:grid-cols-2">
        <Card><CardBody className="pt-6"><h3 className="font-semibold text-brand-900">Plain card</h3><p className="text-sm text-muted mt-1">Body copy inside a card.</p></CardBody></Card>
        <Card className="hover:border-brand-300"><CardBody className="pt-6"><h3 className="font-semibold text-brand-900">Hover card</h3><p className="text-sm text-muted mt-1">Used in grids.</p></CardBody></Card>
      </div>
    ),
  },

  // Auth ---------------------------------------------------------------------
  {
    group: 'Auth', title: 'Sign up',
    node: (
      <div className="p-8 flex justify-center">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl px-6 sm:px-7 pt-7 pb-6">
          <div className="text-center mb-5">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-900">Create your account</h2>
            <p className="text-sm mt-1 font-semibold text-emerald-600">Free to start. No card required.</p>
          </div>
          <GoogleButtonMock />
          <div className="my-4 flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-[--color-border]" /><span>or with email</span><div className="h-px flex-1 bg-[--color-border]" />
          </div>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="First name" /><Input label="Last name" />
            </div>
            <Input label="Email" type="email" />
            <Input label="Password" type="password" hint="At least 8 characters." />
            <Input label="Confirm password" type="password" />
            <Button>Create account</Button>
          </div>
        </div>
      </div>
    ),
  },
  {
    group: 'Auth', title: 'Login',
    node: (
      <div className="p-8 flex justify-center">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl px-6 sm:px-7 pt-7 pb-6">
          <div className="text-center mb-5">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-900">Welcome back</h2>
            <p className="text-sm mt-1 text-muted">Login to continue your journey.</p>
          </div>
          <GoogleButtonMock />
          <div className="my-4 flex items-center gap-3 text-xs text-muted">
            <div className="h-px flex-1 bg-[--color-border]" /><span>or with email</span><div className="h-px flex-1 bg-[--color-border]" />
          </div>
          <div className="flex flex-col gap-3">
            <Input label="Email" type="email" />
            <Input label="Password" type="password" />
            <Button>Login</Button>
            <button className="text-xs text-muted text-center hover:text-foreground">Forgot password?</button>
          </div>
        </div>
      </div>
    ),
  },
  {
    group: 'Auth', title: 'Verify email',
    node: (
      <div className="p-8 flex justify-center">
        <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl px-6 sm:px-7 pt-7 pb-6 flex flex-col gap-4">
          <h2 className="text-xl font-semibold tracking-tight text-brand-900">Verify your email</h2>
          <p className="text-sm text-muted">A verification link was sent to <b className="text-foreground">maya@example.com</b>. Click it to confirm your account.</p>
          <p className="text-xs text-muted">Don&apos;t see it? Check your spam folder.</p>
          <button className="text-sm text-brand-700 hover:underline text-left">Resend verification email</button>
        </div>
      </div>
    ),
  },

  // Mentors ------------------------------------------------------------------
  {
    group: 'Mentors', title: 'Browse grid',
    node: (
      <PageWrap>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 mb-6">Find a mentor</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockMentors.map((m) => <MentorCard key={m.id} mentor={m} />)}
        </div>
      </PageWrap>
    ),
  },

  // Mentor hub (gated states) ------------------------------------------------
  {
    group: 'Mentor hub', title: 'Pending review',
    node: (
      <PageWrap>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Mentor Hub</h1>
          <p className="text-sm text-muted mt-1">Welcome back, Maya Singh.</p>
        </div>
        <div className="mt-8 flex flex-col gap-4">
          <Card><CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground">Application under review</h2>
            <p className="text-sm text-muted mt-1">Thanks for applying. Our team is reviewing your profile — this usually takes 1–2 business days. Use the time below to set your availability so it&apos;s ready the moment you&apos;re approved.</p>
          </CardBody></Card>
          <div className="flex gap-2">
            <Button>Set availability</Button>
            <Button variant="outline">Edit profile</Button>
          </div>
        </div>
      </PageWrap>
    ),
  },
  {
    group: 'Mentor hub', title: 'Approved',
    node: (
      <PageWrap>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Mentor Hub</h1>
            <p className="text-sm text-muted mt-1">Welcome back, Maya Singh.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm">Edit profile</Button>
            <Button variant="outline" size="sm">Set availability</Button>
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-4">
          <Card><CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground">Your profile is live</h2>
            <p className="text-sm text-muted mt-1">Mentees can discover you on the platform. <span className="text-brand-700">View public profile →</span></p>
          </CardBody></Card>
          <Card><CardBody className="pt-6 flex flex-col gap-3">
            <h2 className="text-base font-semibold text-foreground">Your sessions</h2>
            <div className="rounded-lg border border-[--color-border] p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Aditya Rao · Visa & PR guidance</p>
                <p className="text-xs text-muted mt-0.5">Tomorrow, 15:00–16:00 (CET)</p>
              </div>
              <Badge tone="success">Confirmed</Badge>
            </div>
          </CardBody></Card>
        </div>
      </PageWrap>
    ),
  },
  {
    group: 'Mentor hub', title: 'Rejected',
    node: (
      <PageWrap>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Mentor Hub</h1>
        <div className="mt-8">
          <Card><CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground">Application not approved</h2>
            <p className="text-sm text-muted mt-1">Your mentor application wasn&apos;t approved this time. If you think this is a mistake or would like to update your profile and re-apply, please edit your profile or contact support.</p>
          </CardBody></Card>
        </div>
      </PageWrap>
    ),
  },

  // Booking ------------------------------------------------------------------
  {
    group: 'Booking', title: 'Confirmation',
    node: (
      <PageWrap>
        <div className="max-w-md mx-auto">
          <Card><CardBody className="pt-8 pb-6 text-center flex flex-col gap-3">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 text-xl">✓</div>
            <h2 className="text-xl font-semibold text-brand-900">Booking confirmed</h2>
            <p className="text-sm text-muted">Your session with <b className="text-foreground">Maya Singh</b> is booked.</p>
            <div className="rounded-lg border border-[--color-border] p-4 text-left text-sm flex flex-col gap-1 mt-2">
              <div className="flex justify-between"><span className="text-muted">When</span><span className="text-foreground">Tue 12 May, 15:00 CET</span></div>
              <div className="flex justify-between"><span className="text-muted">Service</span><span className="text-foreground">Visa & PR guidance (60 min)</span></div>
              <div className="flex justify-between"><span className="text-muted">Ref</span><span className="text-foreground">IMG-8F3A1</span></div>
            </div>
            <Button className="mt-2">Join Google Meet</Button>
          </CardBody></Card>
        </div>
      </PageWrap>
    ),
  },
  {
    group: 'Booking', title: 'Manage (mentee)',
    node: (
      <PageWrap>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 mb-6">Your bookings</h1>
        <Card><CardBody className="pt-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Maya Singh · Visa & PR guidance</p>
              <p className="text-xs text-muted mt-0.5">Tue 12 May, 15:00 CET · 60 min</p>
            </div>
            <Badge tone="success">Confirmed</Badge>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline">Reschedule</Button>
            <Button size="sm" variant="outline">Cancel</Button>
            <Button size="sm" variant="ghost">Report no-show</Button>
          </div>
        </CardBody></Card>
      </PageWrap>
    ),
  },

  // Admin --------------------------------------------------------------------
  {
    group: 'Admin', title: 'Approval queue',
    node: (
      <PageWrap>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900 mb-1">Mentor approvals</h1>
        <p className="text-sm text-muted mb-6">2 applications awaiting review.</p>
        <div className="flex flex-col gap-3">
          {[mockMentors[0], mockMentors[2]].map((m) => (
            <Card key={m.id}><CardBody className="pt-6 flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-brand-900">{m.display_name}</h3>
                  <Badge tone="warning">Pending</Badge>
                </div>
                <p className="text-sm text-muted mt-1">{m.headline}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {m.expertise_country_codes.map((c) => <Badge key={c} tone="brand">{c}</Badge>)}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button size="sm" variant="accent">Approve</Button>
                <Button size="sm" variant="outline">Reject</Button>
              </div>
            </CardBody></Card>
          ))}
        </div>
      </PageWrap>
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
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-[--color-border] bg-white h-screen sticky top-0 overflow-y-auto">
        <div className="px-4 py-4 border-b border-[--color-border]">
          <p className="text-sm font-semibold text-brand-900">Page preview</p>
          <p className="text-[11px] text-muted mt-0.5">Mock data · no login · design only</p>
        </div>
        <nav className="p-2">
          {GROUPS.map((g) => (
            <div key={g} className="mb-2">
              <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">{g}</p>
              {PREVIEWS.map((p, i) => p.group === g && (
                <button
                  key={p.title}
                  onClick={() => setActive(i)}
                  className={`w-full text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                    active === i ? 'bg-brand-900 text-white' : 'text-brand-800 hover:bg-brand-50'
                  }`}
                >
                  {p.title}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="h-12 shrink-0 border-b border-[--color-border] bg-white flex items-center justify-between px-4">
          <span className="text-sm font-medium text-brand-900">{current.group} / {current.title}</span>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-xs">
            <button onClick={() => setMobile(false)} className={`px-2.5 py-1 rounded-md ${!mobile ? 'bg-white shadow-sm font-medium' : 'text-muted'}`}>Desktop</button>
            <button onClick={() => setMobile(true)} className={`px-2.5 py-1 rounded-md ${mobile ? 'bg-white shadow-sm font-medium' : 'text-muted'}`}>Mobile</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-6 flex justify-center">
          <div
            className={`bg-background rounded-xl border border-[--color-border] overflow-hidden ${mobile ? 'w-[390px]' : 'w-full max-w-5xl'}`}
          >
            {current.node}
          </div>
        </div>
      </main>
    </div>
  );
}
