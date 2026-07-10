import Image from 'next/image';
import Link from 'next/link';
import { CalendarCheck, Globe, Target, UserCheck, ThumbsUp, MessageSquare, Zap, Search } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';
import { Card, CardBody } from './ui/Card';

const FEATURE_ICONS = [
  { icon: Target, tone: 'bg-blue-50 text-blue-600' },
  { icon: UserCheck, tone: 'bg-emerald-50 text-emerald-600' },
  { icon: ThumbsUp, tone: 'bg-amber-50 text-amber-600' },
  { icon: MessageSquare, tone: 'bg-emerald-50 text-emerald-600' },
  { icon: Zap, tone: 'bg-red-50 text-red-600' },
  { icon: Search, tone: 'bg-brand-50 text-brand-700' },
];

export function AboutContent() {
  const a = UI_CONTENT.about;

  return (
    <div className="pb-20">
      {/* ── What we do ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
          {/* Image, top-aligned with the copy, with two badges + a caption inside it */}
          <div className="relative">
            <Image
              src="/tourists-go-up-hill-sunrise.jpg"
              alt="Two travellers helping each other up a hill at sunrise"
              width={1600} height={1067} priority
              className="w-full h-auto rounded-2xl object-cover shadow-sm"
            />
            <div className="absolute inset-x-0 bottom-0 h-2/5 rounded-b-2xl bg-gradient-to-t from-black/75 to-transparent" />

            {/* Since 2021 - top left */}
            <div className="absolute top-4 left-4 flex items-center gap-2.5 rounded-xl bg-white/95 px-3 py-2 shadow-lg">
              <span className="h-8 w-8 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                <CalendarCheck className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-brand-900 leading-tight">{a.badgeSince.title}</span>
                <span className="block text-xs text-muted leading-tight">{a.badgeSince.sub}</span>
              </span>
            </div>

            {/* Countries covered - bottom right */}
            <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-lg">
              <Globe className="h-4 w-4 text-brand-600" />
              <span className="text-xs font-semibold text-brand-900">{a.badgeCountries}</span>
            </div>

            {/* Caption inside the image - bottom left, above the badge row */}
            <p className="absolute bottom-16 left-4 right-4 text-white font-semibold text-sm sm:text-base leading-snug">
              {a.imageCaption}
            </p>
          </div>

          {/* Copy */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-brand-900">{a.whatWeDoTitle}</h1>
            <p className="mt-4 text-xl font-semibold text-brand-900 leading-snug">{a.subheading}</p>
            <div className="mt-5 flex flex-col gap-4 text-base text-muted leading-relaxed">
              {a.paragraphs.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div>
        </div>

        {/* Full-width highlight band */}
        <div className="mt-8 rounded-2xl bg-amber-50 border border-amber-100 px-6 sm:px-8 py-6 flex flex-col gap-3 text-base leading-relaxed text-brand-900">
          {a.band.map((line, i) => (
            <p key={i} className={i === a.band.length - 1 ? 'font-medium' : ''}>{line}</p>
          ))}
        </div>
      </section>

      {/* ── Why us ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            <span className="text-brand-900">{a.whyHeadlineA}</span>
            <span className="text-brand-700">{a.whyHeadlineB}</span>
          </h2>
          <p className="mt-4 text-base text-muted leading-relaxed">{a.whyIntro}</p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 reveal-children">
          {UI_CONTENT.whyJoin.map((w, i) => {
            const { icon: Icon, tone } = FEATURE_ICONS[i % FEATURE_ICONS.length];
            return (
              <Card key={w.title}>
                <CardBody className="pt-6 flex flex-col gap-3">
                  <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${tone}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="text-lg font-semibold text-brand-900">{w.title}</h3>
                  <p className="text-sm text-muted leading-relaxed">{w.body}</p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-brand-900">{a.ctaTitle}</h2>
        <p className="mt-4 text-base text-muted leading-relaxed">{a.ctaIntro}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition-colors"
          >
            {a.ctaChat}
          </Link>
          <Link
            href="/mentors"
            className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-brand-900 text-white text-sm font-semibold hover:bg-brand-800 transition-colors"
          >
            {a.ctaMentors}
          </Link>
        </div>
      </section>
    </div>
  );
}
