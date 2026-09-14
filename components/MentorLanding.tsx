'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarCheck,
  Wallet,
  UserPlus,
  User,
  ShieldCheck,
  Calendar,
  Rocket,
} from 'lucide-react';
import { Button } from './ui/Button';

const EYEBROW = 'text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700';

const BENEFITS = [
  { icon: BadgeCheck, title: 'Build your personal brand', description: 'Showcase your expertise and stand out as a trusted voice in your field.' },
  { icon: BookOpen, title: 'Share your hard-earned experience', description: 'Help others with insights from your real-life immigration and career journey.' },
  { icon: Wallet, title: 'Monetize your time & knowledge', description: 'Turn your valuable experience into a meaningful earning opportunity.' },
  { icon: CalendarCheck, title: 'Flexible scheduling', description: 'Set your own availability and guide others at your own pace.' },
];

const STEPS = [
  { icon: UserPlus, label: 'Account', description: 'Create your free mentor account.' },
  { icon: User, label: 'Profile', description: 'Add your background, destinations, and expertise.' },
  { icon: Calendar, label: 'Availability', description: 'Set the hours you can take sessions.' },
  { icon: ShieldCheck, label: 'Review', description: 'Our team reviews your profile and services.' },
  { icon: Rocket, label: 'Go live', description: 'Accept bookings and start earning.' },
];

export function MentorLanding() {
  const router = useRouter();
  const pathname = usePathname();

  // Opens the same login popup as the rest of the site, in mentor mode: ask for the
  // email first, then either sign in an existing mentor or send a verification link
  // to a new one. After auth they land on the mentor onboarding form.
  function openSignup() {
    router.push(`${pathname}?auth=open&role=mentor`);
  }

  return (
    <div>
      <section className="container-public py-16 sm:py-20">
        <div className="max-w-3xl">
          <p className={EYEBROW}>For mentors</p>
          <h1 className="font-display mt-4 text-4xl sm:text-5xl font-bold leading-[1.1] tracking-tight text-brand-900">Become a mentor</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted">Help immigrants navigate their career journey with the experience you already have.</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Button variant="accent" size="lg" onClick={openSignup}>Create mentor account <ArrowRight className="h-4 w-4" /></Button>
            <Link href="/mentor-verification" className="inline-flex items-center gap-2 text-[15px] font-semibold text-brand-600 hover:text-brand-900">
              <ShieldCheck className="h-4 w-4" />How mentor approval works
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-(--color-border) bg-white">
        <div className="container-public grid sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map(({ icon: Icon, title, description }, i) => (
            <div key={title}
              className={`py-9 sm:px-7 ${i === 0 ? 'lg:pl-0' : ''} ${i < BENEFITS.length - 1 ? 'border-b lg:border-b-0 lg:border-r border-(--color-border)' : ''} ${i % 2 === 0 ? 'sm:max-lg:border-r' : ''} ${i >= 2 ? 'sm:max-lg:border-b-0' : ''}`}>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
              <h2 className="mt-5 text-lg font-semibold text-brand-900">{title}</h2>
              <p className="mt-2 text-base leading-7 text-muted">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-public py-20">
        <div className="max-w-2xl">
          <p className={EYEBROW}>How it works</p>
          <h2 className="font-display mt-3 text-3xl font-bold text-brand-900">From application to your first booking</h2>
        </div>
        <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-5">
          {STEPS.map(({ icon: Icon, label, description }, i) => (
            <li key={label} className="border-t border-(--color-border) pt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-accent-700">{String(i + 1).padStart(2, '0')}</span>
                <Icon className="h-5 w-5 text-brand-600" />
              </div>
              <h3 className="mt-3 text-lg font-semibold text-brand-900">{label}</h3>
              <p className="mt-2 text-base leading-7 text-muted">{description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-public pb-20">
        <div className="flex flex-col gap-6 rounded-[20px] bg-brand-900 px-6 py-10 text-white sm:flex-row sm:items-end sm:justify-between sm:px-10">
          <div>
            <p className="text-sm text-white/70">Ready to start?</p>
            <h2 className="font-display mt-2 max-w-2xl text-3xl font-bold">Create a free mentor account and begin the application process.</h2>
          </div>
          <Button variant="accent" size="lg" className="shrink-0" onClick={openSignup}>Create mentor account</Button>
        </div>
      </section>
    </div>
  );
}
