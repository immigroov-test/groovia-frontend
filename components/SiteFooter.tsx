import Image from 'next/image';
import Link from 'next/link';

const GROUPS = [
  { title: 'Explore', links: [['Ask Groovia', '/home'], ['Find a mentor', '/mentors'], ['Webinars', '/webinars']] },
  { title: 'Organization', links: [['About Immigroov', '/about'], ['Company facts', '/company'], ['How it works', '/how-it-works'], ['Partnerships', '/partnerships'], ['Careers', '/careers']] },
  { title: 'Support', links: [['Pricing', '/pricing'], ['FAQ', '/faq'], ['Contact', '/contact'], ['Refunds & cancellations', '/refund-policy']] },
  { title: 'Legal', links: [['Terms & privacy', '/privacy'], ['Guidance disclaimer', '/immigration-disclaimer'], ['Data subject rights', '/legal/data-subject-request']] },
] as const;

export function SiteFooter() {
  return <footer className="mt-12 border-t border-(--color-border) bg-white">
    <div className="container-public grid gap-10 py-12 lg:grid-cols-[1.4fr_3fr]">
      <div><Image src="/Immigroov_Transparent_Logo.png" alt="Immigroov" width={280} height={60} className="h-7 w-auto object-contain" /><p className="mt-4 max-w-xs text-sm leading-6 text-muted">Practical guidance, lived experience, and live learning for people planning an international move.</p></div>
      <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">{GROUPS.map((group) => <div key={group.title}><h2 className="text-sm font-semibold text-brand-900">{group.title}</h2><ul className="mt-4 space-y-3">{group.links.map(([label, href]) => <li key={href}><Link href={href} className="text-sm text-muted hover:text-brand-900">{label}</Link></li>)}</ul></div>)}</div>
    </div>
    <div className="border-t border-(--color-border)"><div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 flex flex-col gap-2 sm:flex-row sm:justify-between text-xs text-muted"><p>© {new Date().getFullYear()} Immigroov. All rights reserved.</p><p>Guidance is educational and does not guarantee an immigration outcome.</p></div></div>
  </footer>;
}