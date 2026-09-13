import Link from 'next/link';
import { Building2, Globe2, Mail, MapPin } from 'lucide-react';
import { PageHeader } from '../../../components/ui/PageHeader';

export const metadata = { title: 'Company facts - Immigroov', description: 'Key facts about Immigroov, its services, operating entities, and global community.' };

export default function CompanyPage() {
  const facts = [['Established', '2025'], ['Platform record', '600+ mentoring sessions'], ['Mentor community', '65+ mentors'], ['Global experience', '20 countries represented']];
  return <main className="container-public py-16 sm:py-24">
    <PageHeader eyebrow="Company facts" title="Immigroov at a glance" description="Immigroov is a peer-to-peer immigration mentoring platform. Groovia, the platform’s guidance assistant, helps people find a useful starting point before they explore mentors and live webinars." />
    <p className="mt-5 text-xs text-muted">Platform figures updated September 2026</p>
    <dl className="mt-12 grid border-y border-[--color-border] sm:grid-cols-2 lg:grid-cols-4">{facts.map(([term, value], index) => <div key={term} className={`py-7 sm:px-6 ${index < facts.length - 1 ? 'border-b sm:border-b-0 sm:border-r border-[--color-border]' : ''}`}><dt className="text-sm text-muted">{term}</dt><dd className="mt-2 text-xl font-semibold text-brand-900">{value}</dd></div>)}</dl>
    <div className="mt-14 grid gap-12 lg:grid-cols-2">
      <section><h2 className="font-display text-3xl font-semibold text-brand-900">Services</h2><ul className="mt-5 space-y-4 text-base leading-7 text-muted"><li><strong className="text-foreground">Groovia:</strong> assisted initial guidance and discovery.</li><li><strong className="text-foreground">Mentor sessions:</strong> private conversations based on relevant lived experience.</li><li><strong className="text-foreground">Webinars:</strong> focused live learning for international movers.</li></ul></section>
      <section><h2 className="font-display text-3xl font-semibold text-brand-900">Operating presence</h2><div className="mt-5 space-y-5 text-sm leading-6 text-muted"><p className="flex gap-3"><Building2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"/><span><strong className="block text-foreground">Immigroov Consulting VOF</strong>Noord Brabant, the Netherlands</span></p><p className="flex gap-3"><MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"/><span><strong className="block text-foreground">Immigroov Consulting India LLP</strong>Trichy, Tamil Nadu, India</span></p><p className="flex gap-3"><Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-700"/>Serving international communities across multiple regions.</p></div></section>
    </div>
    <section className="mt-14 border-t border-[--color-border] pt-9"><h2 className="text-xl font-semibold text-brand-900">Contact</h2><p className="mt-3 flex items-center gap-2 text-sm text-muted"><Mail className="h-4 w-4"/><a href="mailto:support@immigroov.com" className="font-semibold text-brand-700">support@immigroov.com</a></p><div className="mt-6 flex flex-wrap gap-5 text-sm font-semibold"><Link href="/contact" className="text-brand-700">Contact Immigroov</Link><Link href="/partnerships" className="text-brand-700">Partnership enquiries</Link></div></section>
  </main>;
}
