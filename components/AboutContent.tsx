import Link from 'next/link';
import { ArrowRight, Bot, Compass, Users } from 'lucide-react';

export function AboutContent() {
  return <main>
    <section className="container-public py-16 sm:py-20">
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700">About Immigroov</p>
      <h1 className="font-display mt-4 max-w-3xl text-4xl sm:text-5xl font-bold leading-[1.1] text-brand-900">Moving abroad is complex. Finding a useful next step should not be.</h1>
      <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">Immigroov brings initial guidance, lived experience, and focused live learning into one place for people planning an international move.</p>
    </section>
    <section className="border-y border-(--color-border) bg-white"><div className="container-public grid md:grid-cols-3">
      {[[Compass, 'Clarity first', 'We help people understand the next useful action without presenting uncertain information as a promise.'], [Users, 'Human experience', 'Mentors make their background, destination experience, services, and pricing visible before a booking.'], [Bot, 'Technology with limits', 'Groovia can provide a starting point, while important decisions should be checked against official or qualified sources.']].map(([Icon, title, body], i) => { const I = Icon as typeof Compass; return <div key={String(title)} className={`py-9 md:px-8 ${i === 0 ? 'md:pl-0' : ''} ${i < 2 ? 'border-b md:border-b-0 md:border-r border-(--color-border)' : ''}`}><span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700"><I className="h-5 w-5"/></span><h2 className="mt-5 text-lg font-semibold text-brand-900">{String(title)}</h2><p className="mt-2 text-base leading-7 text-muted">{String(body)}</p></div>; })}
    </div></section>
    <section className="container-public py-20"><div className="grid gap-12 md:grid-cols-2"><div><h2 className="font-display text-2xl sm:text-[1.75rem] font-bold text-brand-900">Our approach</h2><p className="mt-4 text-base leading-8 text-muted">Begin with the person’s goal. Make choices understandable. Show real profiles and real events only when they exist. Keep commercial details visible before commitment.</p></div><div><h2 className="font-display text-2xl sm:text-[1.75rem] font-bold text-brand-900">What we do not claim</h2><p className="mt-4 text-base leading-8 text-muted">Immigroov does not promise visas, admissions, jobs, or relocation outcomes. It does not replace official requirements or regulated professional advice.</p></div></div><Link href="/how-it-works" className="mt-10 inline-flex h-12 items-center gap-2 rounded-[10px] bg-accent-600 px-6 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(235,74,18,0.22)] hover:bg-accent-700">See how Immigroov works <ArrowRight className="h-4 w-4"/></Link></section>
  </main>;
}
