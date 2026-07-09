import Image from 'next/image';
import Link from 'next/link';
import { CalendarCheck, Target, UserCheck, ThumbsUp, MessageSquare, Zap, Search } from 'lucide-react';
import { Card, CardBody } from './ui/Card';

const FEATURES = [
  {
    icon: Target, tone: 'bg-blue-50 text-blue-600',
    title: 'Guidance That Fits Your Life',
    body: 'Our mentors tailor their advice to your exact situation, goals, and questions, not generic info dumps.',
  },
  {
    icon: UserCheck, tone: 'bg-emerald-50 text-emerald-600',
    title: 'Handpicked Mentors, Not Just Volunteers',
    body: 'We select expats and locals based on how long they have lived abroad, what they know, and their ability to guide.',
  },
  {
    icon: ThumbsUp, tone: 'bg-amber-50 text-amber-600',
    title: 'Honest Answers, Not Just Encouragement',
    body: 'Get real insight into what works, what to avoid, and how to plan smart. No sugar-coating.',
  },
  {
    icon: MessageSquare, tone: 'bg-emerald-50 text-emerald-600',
    title: 'Private, Personal Mentorship',
    body: 'No group chats or forums. Every session is personal, one-on-one, and focused entirely on your journey.',
  },
  {
    icon: Zap, tone: 'bg-red-50 text-red-600',
    title: 'You Move Forward Faster',
    body: 'Skip weeks of confusion. Learn directly from someone who has already solved your exact challenges.',
  },
  {
    icon: Search, tone: 'bg-brand-50 text-brand-700',
    title: 'Relevance Over Noise',
    body: 'There is no shortage of information online. What you need is someone to filter what actually matters.',
  },
];

export function AboutContent() {
  return (
    <div className="pb-20">
      {/* ── What we do ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-14">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          {/* Image + badge */}
          <div className="relative">
            <Image
              src="/tourists-go-up-hill-sunrise.jpg"
              alt="Travellers climbing a hill at sunrise"
              width={1600} height={1067} priority
              className="w-full h-auto rounded-2xl object-cover shadow-sm"
            />
            <div className="absolute -top-4 -left-2 sm:-left-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-lg">
              <span className="h-9 w-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600">
                <CalendarCheck className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-brand-900">Since 2021</span>
                <span className="block text-xs text-muted">Building the Movement</span>
              </span>
            </div>
          </div>

          {/* Copy */}
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-brand-900">What we do</h1>
            <p className="mt-4 text-xl font-semibold text-brand-900 leading-snug">
              At Immigroov, we believe moving abroad should feel exciting, not overwhelming.
            </p>
            <div className="mt-5 flex flex-col gap-4 text-base text-muted leading-relaxed">
              <p>
                We built a mentoring platform where real expats and locals, already living in your
                destination country, guide you through moving and settling into your new home.
              </p>
              <p>
                Whether you are handling visas, finding jobs, planning studies, or figuring out daily
                life, from banking, taxes, and housing to transport, culture, and cost of living, our
                mentors do not just share stories. They give you honest, personal guidance based on
                what actually works for your situation.
              </p>
            </div>

            <div className="mt-6 rounded-xl bg-amber-50 border border-amber-100 p-5 flex flex-col gap-3 text-base leading-relaxed text-brand-900">
              <p>
                Maybe, once you are settled, you will become a mentor too, sharing your journey,
                earning, and giving back.
              </p>
              <p>Immigroov is not just a platform, it is a movement.</p>
              <p className="font-semibold">A global community of people helping people move smarter, together.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Why us ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 sm:px-6 pt-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">
            <span className="text-brand-900">Information is Everywhere, </span>
            <span className="text-brand-700">But Relevance is Rare</span>
          </h2>
          <p className="mt-4 text-base text-muted leading-relaxed">
            Immigroov helps you cut through the noise by connecting you with people who have lived it,
            so you get advice that is relevant, personal, and proven.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 reveal-children">
          {FEATURES.map(({ icon: Icon, tone, title, body }) => (
            <Card key={title}>
              <CardBody className="pt-6 flex flex-col gap-3">
                <span className={`h-11 w-11 rounded-xl flex items-center justify-center ${tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-semibold text-brand-900">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{body}</p>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-3xl px-4 sm:px-6 pt-20 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-brand-900">Ready to start your journey?</h2>
        <p className="mt-4 text-base text-muted leading-relaxed">
          Get real-time answers from Groovia, our AI agent, or connect with a mentor who has already
          made the move.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/chat"
            className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-accent-500 text-white text-sm font-semibold hover:bg-accent-600 transition-colors"
          >
            Chat with Groovia AI
          </Link>
          <Link
            href="/mentors"
            className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-brand-900 text-white text-sm font-semibold hover:bg-brand-800 transition-colors"
          >
            Browse Mentors
          </Link>
        </div>
      </section>
    </div>
  );
}
