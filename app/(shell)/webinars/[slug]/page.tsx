import { notFound } from 'next/navigation';
import Link from 'next/link';
import { serverGetPublic } from '../../../../lib/backend';
import { serverAuth } from '../../../../lib/supabase/server';
import { webinarPrice, webinarWhen, type Webinar } from '../../../../lib/webinars';
import { WebinarRegistration } from '../../../../components/WebinarRegistration';
import { Card, CardBody } from '../../../../components/ui/Card';

export default async function WebinarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [result, auth] = await Promise.all([serverGetPublic<Webinar>(`/webinars/${slug}`), serverAuth()]);
  if (result.status === 404 || !result.data) notFound();
  const w = result.data;
  return <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
    <Link href="/webinars" className="text-sm text-brand-700 hover:underline">← All webinars</Link>
    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm"><span className="font-semibold text-brand-700">{webinarPrice(w)}</span><span className="text-muted">{w.duration_minutes} minutes</span></div>
    <h1 className="mt-3 text-3xl font-semibold tracking-tight text-brand-900">{w.title}</h1>
    {w.mentor && <p className="mt-2 text-sm text-muted">Hosted by <Link className="text-brand-700 hover:underline" href={`/mentors/${w.mentor.slug}`}>{w.mentor.display_name}</Link></p>}
    <Card className="mt-7"><CardBody className="pt-6">
      <p className="font-medium text-foreground">{webinarWhen(w)}</p>
      <p className="mt-1 text-sm text-muted">Shown in your local time · {w.registration_count ?? 0} of {w.capacity} seats taken</p>
      <div className="mt-5"><WebinarRegistration webinar={w} loggedIn={!!auth.user} /></div>
    </CardBody></Card>
    <div className="mt-8 whitespace-pre-wrap text-sm leading-7 text-foreground">{w.description}</div>
  </main>;
}
