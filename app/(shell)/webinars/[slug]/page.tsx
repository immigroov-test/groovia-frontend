import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serverGet, serverGetPublic } from '../../../../lib/backend';
import { serverAuth } from '../../../../lib/supabase/server';
import { webinarPrice, webinarWhen, type Webinar } from '../../../../lib/webinars';
import { WebinarRegistration } from '../../../../components/WebinarRegistration';
import { Card, CardBody } from '../../../../components/ui/Card';
import { CalendarDays, Clock3, ShieldCheck, Users } from 'lucide-react';

export default async function WebinarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [result, auth] = await Promise.all([serverGetPublic<Webinar>(`/webinars/${slug}`), serverAuth()]);
  if (result.status === 404 || !result.data) notFound();
  const w = result.data;
  const mine = auth.token ? await serverGet<Array<{ status: string; webinars?: { id: string } | null }>>('/webinars/mine', auth.token) : null;
  const initiallyConfirmed = !!mine?.data?.some((registration) => registration.status === 'confirmed' && registration.webinars?.id === w.id);
  return <main className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
    <Link href="/webinars" className="text-sm text-brand-700 hover:underline">← All webinars</Link>
    <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_340px] items-start"><div>
    <div className="flex flex-wrap items-center gap-3 text-sm"><span className="font-semibold text-accent-700">{webinarPrice(w)}</span><span className="text-muted">Live online session</span></div>
    <h1 className="font-display mt-3 text-4xl sm:text-5xl font-semibold tracking-tight text-brand-900">{w.title}</h1>
    {w.mentor && <p className="mt-2 text-sm text-muted">Hosted by <Link className="text-brand-700 hover:underline" href={`/mentors/${w.mentor.slug}`}>{w.mentor.display_name}</Link></p>}
    <section className="mt-10"><h2 className="text-xl font-semibold text-brand-900">About this webinar</h2><div className="mt-4 whitespace-pre-wrap text-base leading-8 text-foreground">{w.description}</div></section>
    <section className="mt-10 border-t border-[--color-border] pt-8"><h2 className="text-xl font-semibold text-brand-900">Before you register</h2><p className="mt-3 text-sm leading-6 text-muted">This is an educational session, not legal representation or a promise of an immigration outcome. Review the event details and bring questions relevant to the published topic.</p><Link href="/immigration-disclaimer" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-brand-700"><ShieldCheck className="h-4 w-4" />Read the guidance disclaimer</Link></section>
    </div><Card className="lg:sticky lg:top-24"><CardBody className="pt-6">
      <div className="space-y-4 text-sm"><p className="flex gap-3"><CalendarDays className="h-5 w-5 text-accent-600 shrink-0" /><span><strong className="block text-foreground">{webinarWhen(w)}</strong><span className="text-muted">Your local time</span></span></p><p className="flex items-center gap-3 text-muted"><Clock3 className="h-5 w-5" />{w.duration_minutes} minutes</p><p className="flex items-center gap-3 text-muted"><Users className="h-5 w-5" />{Math.max(0, w.capacity - (w.registration_count ?? 0))} seats available</p></div>
      <div className="mt-6 border-t border-[--color-border] pt-6"><WebinarRegistration webinar={w} loggedIn={!!auth.user} initiallyConfirmed={initiallyConfirmed} /></div>
      <p className="mt-4 text-xs leading-5 text-muted">Registration is subject to the published cancellation and refund terms.</p>
    </CardBody></Card></div>
  </main>;
}