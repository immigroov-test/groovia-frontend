import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export interface OrganizationSection { title: string; body?: string; items?: string[]; }

export function OrganizationPage({ eyebrow, title, intro, sections, cta }: {
  eyebrow: string; title: string; intro: string; sections: OrganizationSection[];
  cta?: { label: string; href: string };
}) {
  return <main className="container-public py-16 sm:py-24">
    <header className="max-w-3xl border-b border-(--color-border) pb-10">
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-accent-700">{eyebrow}</p>
      <h1 className="font-display mt-4 text-4xl sm:text-5xl font-bold leading-tight text-brand-900">{title}</h1>
      <p className="mt-5 text-lg leading-8 text-muted">{intro}</p>
    </header>
    <div className="grid gap-x-12 gap-y-10 py-10 md:grid-cols-2">
      {sections.map((section) => <section key={section.title}>
        <h2 className="text-xl font-semibold text-brand-900">{section.title}</h2>
        {section.body && <p className="mt-3 text-base leading-7 text-muted">{section.body}</p>}
        {section.items && <ul className="mt-4 space-y-3">{section.items.map((item) => <li key={item} className="flex gap-3 text-base leading-7 text-muted"><span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />{item}</li>)}</ul>}
      </section>)}
    </div>
    {cta && <div className="border-t border-(--color-border) pt-8"><Link href={cta.href} className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-accent-600 px-6 text-[15px] font-semibold text-white shadow-[0_6px_16px_rgba(235,74,18,0.22)] hover:bg-accent-700">{cta.label}<ArrowRight className="h-4 w-4" /></Link></div>}
  </main>;
}
