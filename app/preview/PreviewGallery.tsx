'use client';
import { useState, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardBody } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { UI_CONTENT } from '../../lib/content';
import { mockMentor, mockMentors } from './mockData';
// Real pages/components — rendered with mock data so the gallery stays in sync with
// the live app. Backend calls are intercepted by MockFetch in the preview frame.
import LandingPage from '../(shell)/page';
import { AboutContent } from '../../components/AboutContent';
import { MentorBrowser } from '../../components/MentorBrowser';
import { DirectBookingWidget } from '../../components/DirectBookingWidget';
import { BookingManager } from '../../components/BookingManager';
import { MentorLanding } from '../../components/MentorLanding';
import { MentorRegisterForm } from '../../components/MentorRegisterForm';
import { MentorOnboardingForm } from '../../components/MentorOnboardingForm';
import { MentorAvailabilityForm } from '../../components/MentorAvailabilityForm';
import { ProfileEditor } from '../../components/ProfileEditor';
import { ChatIntro } from '../../components/ChatIntro';

function PageWrap({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">{children}</div>;
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

// Faithful mirror of the live AuthModal popup (which only mounts when opened via
// ?auth=open). Keep this in sync when the modal's layout changes.
function LoginPopupPreview() {
  const t = UI_CONTENT.auth;
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Logo in a white box, centered across the divider */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 z-30 bg-white rounded-full px-5 py-2.5 shadow-md">
          <img src="/Immigroov_Transparent_Logo.png" alt="Immigroov" style={{ height: '26px', width: 'auto' }} className="object-contain" />
        </div>

        {/* Left — form */}
        <div className="w-full md:w-1/2 px-7 sm:px-9 pt-20 pb-9 flex flex-col min-h-[520px]">
          <div className="mt-2">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-900 text-center">{t.heading}</h2>
            <p className="text-sm text-muted mt-1 text-center">{t.subheading}</p>
            <div className="mt-6 flex flex-col gap-3">
              <Input type="email" placeholder={t.emailPlaceholder} />
              <Button className="w-full">{t.continueWithEmail}</Button>
            </div>
            <div className="my-4 flex items-center gap-3 text-xs text-muted">
              <div className="h-px flex-1 bg-[--color-border]" /><span>{t.orDivider}</span><div className="h-px flex-1 bg-[--color-border]" />
            </div>
            <GoogleButtonMock />
            <p className="mt-4 text-[11px] leading-snug text-muted">
              {t.termsNote} <span className="underline">{t.terms}</span> and <span className="underline">{t.privacy}</span>.
            </p>
          </div>
          <div className="mt-auto pt-8">
            <p className="text-base text-foreground/75 leading-relaxed font-serif">“{UI_CONTENT.quote.text}”</p>
          </div>
        </div>

        {/* Right — brand panel + why-join; quote overlaid on the photo band */}
        <div className="hidden md:flex md:w-1/2 flex-col bg-brand-900 text-white min-h-[520px]">
          <div className="flex-1 px-8 pt-20 pb-6 flex flex-col">
            <h3 className="text-2xl font-semibold">{t.whyJoinTitle}</h3>
            <ul className="mt-6 flex flex-col gap-4">
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
          <div className="relative w-full aspect-[848/330]">
            <img src="/tourists-go-up-hill-sunrise.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/30 to-transparent" />
            <p className="absolute inset-x-0 top-0 px-8 pt-4 text-sm text-white leading-snug font-serif">“{UI_CONTENT.quote.text}”</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Real mentor profile layout (compact header + full-width booking widget). The
// widget's services/slots come from MockFetch.
function MentorProfilePreview() {
  const initials = mockMentor.display_name.split(' ').map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <span className="text-sm text-muted">← All mentors</span>
      <div className="flex items-start gap-4 mt-6">
        <div className="h-16 w-16 rounded-full bg-brand-100 flex items-center justify-center text-lg font-semibold text-brand-700 shrink-0">{initials}</div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-brand-900">{mockMentor.display_name}</h1>
          <p className="text-base text-muted mt-1 max-w-2xl">{mockMentor.headline}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {mockMentor.expertise_country_codes.map((c) => <Badge key={c} tone="brand">{c}</Badge>)}
            {(mockMentor.expertise_categories ?? []).map((cat) => <Badge key={cat} tone="neutral">{cat}</Badge>)}
            {mockMentor.languages.map((l) => <Badge key={l} tone="neutral">{l.toUpperCase()}</Badge>)}
          </div>
        </div>
      </div>
      <p className="text-sm text-foreground/80 leading-relaxed max-w-2xl mt-4 mb-8 whitespace-pre-line">{mockMentor.bio}</p>
      <DirectBookingWidget
        mentorTimezone={mockMentor.timezone ?? undefined}
        mentor={{ id: mockMentor.id, slug: mockMentor.slug, display_name: mockMentor.display_name,
          headline: mockMentor.headline ?? null, bio: mockMentor.bio ?? null, photo_url: null }}
      />
    </div>
  );
}

// ── Previews, organized by user flow ─────────────────────────────────────────
export const PREVIEWS: { group: string; title: string; real?: boolean; node: ReactNode }[] = [
  // 1. DISCOVER (public) -----------------------------------------------------
  { group: '1 · Discover', title: 'Landing page', real: true, node: <LandingPage /> },
  {
    group: '1 · Discover', title: 'Browse mentors', real: true, node: (
      <PageWrap>
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900 mb-6">Find a mentor</h1>
        <MentorBrowser mentors={mockMentors} />
      </PageWrap>
    ),
  },
  { group: '1 · Discover', title: 'Mentor profile + booking', real: true, node: <MentorProfilePreview /> },
  { group: '1 · Discover', title: 'About', real: true, node: <AboutContent /> },
  { group: '1 · Discover', title: 'Privacy policy', node: (
      <PageWrap><h1 className="text-3xl font-semibold text-brand-900 mb-4">Privacy Policy</h1><p className="text-sm text-muted">Static legal text page. View the real content at <code>/privacy</code> — it renders without auth, so it&apos;s not mocked here.</p></PageWrap>
    ) },
  { group: '1 · Discover', title: 'Terms', node: (
      <PageWrap><h1 className="text-3xl font-semibold text-brand-900 mb-4">Terms &amp; Conditions</h1><p className="text-sm text-muted">Static legal text page. View the real content at <code>/terms</code>.</p></PageWrap>
    ) },

  // 2. LOGIN -----------------------------------------------------------------
  { group: '2 · Login', title: 'Login popup (magic link)', node: <LoginPopupPreview /> },

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

  // 5. MY SESSIONS (real BookingManager) -------------------------------------
  {
    group: '5 · My sessions', title: 'Mentee — upcoming & past', real: true, node: (
      <PageWrap><h1 className="text-2xl font-semibold tracking-tight text-brand-900 mb-6">Your sessions</h1><BookingManager role="mentee" /></PageWrap>
    ),
  },
  {
    group: '5 · My sessions', title: 'Mentor — sessions', real: true, node: (
      <PageWrap><h1 className="text-2xl font-semibold tracking-tight text-brand-900 mb-6">Mentor sessions</h1><BookingManager role="mentor" /></PageWrap>
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
          <p className="text-[11px] text-muted mt-0.5">Mock data · no login · live components</p>
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
