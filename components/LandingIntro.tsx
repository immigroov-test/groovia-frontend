'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeCheck, Building2, CalendarDays, CheckCircle2, Compass, Globe, MessageCircle, ReceiptText, ShieldCheck, Star, Users } from 'lucide-react';
import type { Mentor } from '../lib/types';
import { MentorCard } from './MentorCard';
import { ReviewsMarquee } from './ReviewsMarquee';
import { MentorPhotoStrip } from './MentorPhotoStrip';
import { REVIEW_AVERAGE } from '../lib/content/reviews';
import { webinarPrice, webinarWhen, type Webinar } from '../lib/webinars';

interface Props { onReveal: () => void; mentors?: Mentor[]; webinars?: Webinar[]; }

const EYEBROW = 'text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700';

export const LandingIntro = forwardRef<HTMLDivElement, Props>(function LandingIntro(
  { onReveal, mentors = [], webinars = [] }, ref,
) {
  const photoMentors = mentors.filter((m) => m.photo_url);
  const showCollage = photoMentors.length >= 4;

  return <div ref={ref} className="relative z-10 w-full">
    <section className={`container-public py-16 sm:py-20 ${showCollage ? 'grid grid-cols-1 items-center gap-10 lg:gap-14 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]' : ''}`}>
      <div className="max-w-3xl">
        <p className={`mb-5 ${EYEBROW}`}>Practical guidance for moving abroad</p>
        <h1 className="font-display text-4xl sm:text-[3.5rem] font-bold leading-[1.07] tracking-tight text-brand-900">Move abroad with guidance you can act on.</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Get a clear starting point from Groovia, speak with people who have made the move, and learn through focused live webinars.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={onReveal} className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-accent-600 px-6 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(235,74,18,0.22)] hover:bg-accent-700">Ask Groovia <ArrowRight className="h-4 w-4" /></button>
          <Link href="/mentors" className="inline-flex h-12 items-center rounded-[10px] border border-brand-200 bg-white px-6 text-[15px] font-semibold text-brand-800 hover:border-brand-500">Find a mentor</Link>
        </div>
      </div>
      {showCollage && <MentorPhotoStrip mentors={photoMentors} />}
    </section>

    <section className="border-y border-(--color-border) bg-white">
      <div className="container-public py-9">
        <div className="grid grid-cols-2 gap-x-6 gap-y-7 lg:grid-cols-4">
          {([
            [Users, '600+', 'mentoring sessions'],
            [BadgeCheck, '65+', 'approved mentors'],
            [Globe, '20', 'countries represented'],
            [Star, `${REVIEW_AVERAGE.toFixed(1)}/5`, 'average session rating'],
          ] as const).map(([Icon, value, label]) => (
            <div key={label} className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700"><Icon className="h-5 w-5" /></span>
              <div><strong className="block text-2xl font-bold leading-tight text-brand-900">{value}</strong><span className="text-sm text-muted">{label}</span></div>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col gap-4 border-t border-(--color-border) pt-5 xl:flex-row xl:items-center xl:justify-between">
          <ul className="flex flex-wrap gap-x-7 gap-y-2 text-sm text-muted">
            <li className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand-600" />Every mentor profile reviewed</li>
            <li className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-brand-600" />Registered in the Netherlands and India</li>
            <li className="inline-flex items-center gap-2"><ReceiptText className="h-4 w-4 text-brand-600" />Price shown before you pay</li>
            <li className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-brand-600" />No guaranteed-outcome claims</li>
          </ul>
          <p className="text-xs text-muted">Platform record · Updated September 2026</p>
        </div>
      </div>
    </section>

    <section className="border-b border-(--color-border) bg-brand-50/40">
      <div className="container-public py-20">
        <div className="max-w-2xl"><p className={EYEBROW}>Support that fits the question</p><h2 className="font-display mt-3 text-3xl font-bold text-brand-900">Different questions need different kinds of support</h2></div>
        <div className="mt-9 grid border-y border-(--color-border) sm:grid-cols-3">
      {[
        [MessageCircle, 'Groovia', 'Immigroov’s guidance assistant helps you find a useful starting point.'],
        [Users, 'Mentor sessions', 'Private conversations with people who bring relevant lived experience.'],
        [CalendarDays, 'Live webinars', 'Focused learning around questions shared by many international movers.'],
      ].map(([Icon, title, body], index) => { const I = Icon as typeof MessageCircle; return <div key={String(title)} className={`py-7 sm:px-8 ${index < 2 ? 'border-b sm:border-b-0 sm:border-r border-(--color-border)' : ''}`}><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-700 shadow-(--shadow-1)"><I className="h-5 w-5" /></span><h3 className="mt-5 text-lg font-semibold text-brand-900">{String(title)}</h3><p className="mt-2 text-base leading-7 text-muted">{String(body)}</p></div>; })}
        </div>
      </div>
    </section>

    <section className="container-public py-20">
      <div className="grid gap-10 lg:grid-cols-[0.8fr_1.5fr] lg:items-start">
        <div><Compass className="h-6 w-6 text-brand-700"/><p className={`mt-5 ${EYEBROW}`}>How Immigroov works</p><h2 className="font-display mt-3 text-3xl font-bold text-brand-900">A clear path from uncertainty to action</h2></div>
        <ol className="grid gap-x-8 gap-y-8 sm:grid-cols-2">{[
          ['01', 'Explore your options', 'Start with Groovia or browse by destination.'],
          ['02', 'Choose relevant experience', 'Compare approved mentors and their services.'],
          ['03', 'Book with clarity', 'See duration, price, and availability before confirming.'],
          ['04', 'Prepare for your move', 'Use the conversation to identify practical next steps.'],
        ].map(([number, title, body]) => <li key={number} className="border-t border-(--color-border) pt-5"><span className="text-sm font-semibold text-accent-700">{number}</span><h3 className="mt-3 text-lg font-semibold text-brand-900">{title}</h3><p className="mt-2 text-base leading-7 text-muted">{body}</p></li>)}</ol>
      </div>
    </section>

    {mentors.length > 0 && <section className="container-public pb-20">
      <div className="flex items-end justify-between gap-4"><div><p className={EYEBROW}>Mentors</p><h2 className="font-display mt-3 text-3xl font-bold text-brand-900">Meet people guiding the Immigroov community.</h2><p className="mt-3 text-base text-muted">Approved mentors currently available on Immigroov.</p></div><Link href="/mentors" className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-900">View all mentors →</Link></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{mentors.slice(0, 3).map((mentor) => <MentorCard key={mentor.id} mentor={mentor} />)}</div>
      <p className="mt-5 inline-flex items-center gap-2 text-sm text-muted"><ShieldCheck className="h-4 w-4" />Approval reflects Immigroov’s profile and service review. <Link href="/mentor-verification" className="font-semibold text-brand-600 hover:text-brand-900">How approval works</Link></p>
    </section>}

    <ReviewsMarquee />

    {webinars.length > 0 && <section className="container-public py-20">
      <div className="flex items-end justify-between gap-4"><div><p className={EYEBROW}>Live learning</p><h2 className="font-display mt-3 text-3xl font-bold text-brand-900">Upcoming webinars</h2></div><Link href="/webinars" className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-900">View all →</Link></div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">{webinars.slice(0, 2).map((webinar) => <Link key={webinar.id} href={`/webinars/${webinar.slug}`} className="overflow-hidden rounded-[14px] border border-(--color-border) bg-white hover:border-brand-400">{webinar.banner_url && <img src={webinar.banner_url} alt="" className="aspect-[16/7] w-full border-b border-(--color-border) object-cover" />}<div className="p-6"><div className="flex justify-between gap-4 text-xs"><span className="font-semibold text-accent-700">{webinarPrice(webinar)}</span><span className="text-muted">{webinar.duration_minutes} min</span></div><h3 className="mt-4 text-xl font-semibold text-brand-900">{webinar.title}</h3><p className="mt-4 text-sm text-muted">{webinarWhen(webinar)}</p>{webinar.mentor && <p className="mt-1 text-sm text-muted">Hosted by {webinar.mentor.display_name}</p>}</div></Link>)}</div>
    </section>}

    <section className={`bg-brand-50/40 border-b border-(--color-border) ${webinars.length > 0 ? 'border-t' : ''}`}><div className="container-public grid gap-10 py-16 md:grid-cols-2 md:items-center">
      <div><p className={EYEBROW}>Global perspective</p><h2 className="font-display mt-3 max-w-md text-3xl font-bold text-brand-900">Based in the Netherlands. Built for international communities.</h2><p className="mt-4 text-base leading-7 text-muted">Immigroov serves people across India, the Middle East, Asia, Europe, the United States, and Australia.</p><Link href="/company" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-900">Company facts <ArrowRight className="h-4 w-4"/></Link></div>
      <div className="border-l-2 border-brand-200 pl-6 sm:pl-8"><h3 className="font-display text-2xl font-bold text-brand-900">Experience moves forward</h3><p className="mt-4 text-base leading-7 text-muted">Immigroov helps people learn from those who have already made a similar move. Over time, today’s movers can become tomorrow’s mentors.</p><Link href="/mentor/register" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-900">Become a mentor <ArrowRight className="h-4 w-4"/></Link></div>
    </div></section>

    <section className="container-public py-20"><div className="rounded-[20px] bg-brand-900 px-6 py-10 sm:px-10 text-white"><p className="text-sm text-white/70">Not sure where to begin?</p><div className="mt-2 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"><h2 className="font-display max-w-2xl text-3xl font-bold">Tell Groovia what you are planning. We’ll help you find the next useful step.</h2><button type="button" onClick={onReveal} className="shrink-0 rounded-[10px] bg-accent-600 px-6 py-3 text-[15px] font-semibold text-white hover:bg-accent-700">Start a conversation</button></div></div></section>
  </div>;
});
