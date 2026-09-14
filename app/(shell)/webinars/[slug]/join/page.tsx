import { redirect, notFound } from 'next/navigation';
import { serverAuth } from '../../../../../lib/supabase/server';
import { serverGetPublic } from '../../../../../lib/backend';
import type { Webinar } from '../../../../../lib/webinars';
import { JoinWebinar } from '../../../../../components/JoinWebinar';
import { Card, CardBody } from '../../../../../components/ui/Card';

export default async function WebinarJoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const { user } = await serverAuth();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/webinars/${slug}/join`)}`);
  const result = await serverGetPublic<Webinar>(`/webinars/${slug}`); if (!result.data) notFound();
  return <main className="mx-auto max-w-xl px-4 py-10 sm:py-16"><Card className="rounded-[1.25rem] shadow-(--shadow-1)"><CardBody className="pt-7 sm:p-8">
    <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700">Webinar room</p>
    <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold leading-tight text-brand-900">{result.data.title}</h1>
    <p className="mt-3 text-[15px] leading-relaxed text-muted">The room opens 15 minutes before the scheduled start. Jitsi will open in a new tab.</p>
    <div className="mt-6"><JoinWebinar webinarId={result.data.id} /></div>
  </CardBody></Card></main>;
}
