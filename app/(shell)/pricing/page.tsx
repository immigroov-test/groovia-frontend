import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, CalendarDays, Check, MessageCircle, RefreshCcw, Users } from 'lucide-react';
import { MentorPriceRange } from '../../../components/MentorPriceRange';
import { backendBaseUrl } from '../../../lib/backend';
import type { Mentor } from '../../../lib/types';

export const metadata = { title: 'Pricing - Immigroov', description: 'How pricing works for Groovia guidance, mentor sessions, and webinars.' };

async function fetchMentors(): Promise<Mentor[]> {
  try {
    const res = await fetch(`${backendBaseUrl()}/mentors?limit=300`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    return (await res.json()).mentors ?? [];
  } catch {
    return [];
  }
}

const TITLE = 'font-display mt-3 text-[1.75rem] font-bold leading-tight text-brand-900';

export default async function Page() {
  const mentors = await fetchMentors();
  const serviceIds = mentors
    .filter((m) => (m.min_price ?? 0) > 0 && m.min_price_service_id)
    .map((m) => m.min_price_service_id as string);
  const freeIntroCount = mentors.filter((m) => m.has_free_session).length;

  const plans: { icon: typeof Users; name: string; price: ReactNode; note: string; points: string[]; cta: { label: string; href: string }; featured?: boolean }[] = [
    {
      icon: MessageCircle, name: 'Groovia guidance', price: <p className={TITLE}>Free to try</p>, note: 'No payment needed to start',
      points: ['Guests can try a limited number of questions', 'Any account requirements or limits are shown before you continue'],
      cta: { label: 'Ask Groovia', href: '/home' },
    },
    {
      icon: Users, name: 'Mentor sessions', featured: true,
      price: <MentorPriceRange serviceIds={serviceIds} />,
      note: freeIntroCount > 0
        ? `Starting price per session, in your currency · ${freeIntroCount} mentors offer a free intro`
        : 'Starting price per session, shown in your currency',
      points: ['Each mentor sets their own rate', 'Session duration and price shown on every profile', 'The price you see is presented again before checkout'],
      cta: { label: 'Compare mentors', href: '/mentors' },
    },
    {
      icon: CalendarDays, name: 'Live webinars', price: <p className={TITLE}>Free or paid</p>, note: 'Clearly labelled on each event',
      points: ['Paid registrations show the event price before payment', 'Focused sessions on common moving questions'],
      cta: { label: 'Browse webinars', href: '/webinars' },
    },
  ];

  return <main className="container-public py-16 sm:py-20">
    <header className="max-w-3xl">
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700">Pricing</p>
      <h1 className="font-display mt-4 text-4xl sm:text-5xl font-bold leading-[1.1] text-brand-900">See the price before you commit.</h1>
      <p className="mt-5 text-lg leading-8 text-muted">Groovia does not use a single fixed price for every service. The exact amount is shown on the relevant mentor or webinar page before payment.</p>
    </header>

    <div className="mt-12 grid gap-5 lg:grid-cols-3">
      {plans.map(({ icon: Icon, name, price, note, points, cta, featured }) => (
        <section key={name} className={`flex flex-col rounded-[1.25rem] border bg-white p-7 ${featured ? 'border-accent-300 shadow-(--shadow-2)' : 'border-(--color-border) shadow-(--shadow-1)'}`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
          <h2 className="mt-5 text-lg font-semibold text-brand-900">{name}</h2>
          {price}
          <p className="mt-1 text-sm text-muted">{note}</p>
          <ul className="mt-6 flex-1 space-y-3 border-t border-(--color-border) pt-6">
            {points.map((point) => <li key={point} className="flex gap-3 text-base leading-7 text-muted"><Check className="mt-1.5 h-4 w-4 shrink-0 text-accent-600" />{point}</li>)}
          </ul>
          <Link href={cta.href} className={`mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-[10px] px-6 text-[15px] font-semibold ${featured ? 'bg-accent-600 text-white shadow-[0_6px_16px_rgba(235,74,18,0.22)] hover:bg-accent-700' : 'border border-brand-200 bg-white text-brand-800 hover:border-brand-500'}`}>
            {cta.label}<ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ))}
    </div>

    <section className="mt-14 flex flex-col gap-5 rounded-[1.25rem] border border-(--color-border) bg-brand-50/50 p-7 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-brand-700 shadow-(--shadow-1)"><RefreshCcw className="h-5 w-5" /></span>
        <div>
          <h2 className="text-lg font-semibold text-brand-900">Changes and refunds</h2>
          <p className="mt-1 max-w-2xl text-base leading-7 text-muted">Cancellation, rescheduling, and refund eligibility depend on the relevant published terms. Review them before completing payment.</p>
        </div>
      </div>
      <Link href="/refund-policy" className="inline-flex shrink-0 items-center gap-2 text-[15px] font-semibold text-brand-600 hover:text-brand-900">Refund policy <ArrowRight className="h-4 w-4" /></Link>
    </section>
  </main>;
}
