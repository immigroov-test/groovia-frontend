'use client';
import { useState } from 'react';
import { Card, CardBody } from './ui/Card';
import { Badge } from './ui/Badge';
import { ProfileEditor } from './ProfileEditor';
import { BookingManager } from './BookingManager';
import Link from 'next/link';
import { CalendarDays, MessageCircle, Search, UserRound } from 'lucide-react';
import { HistoryList } from './HistoryList';

type Tab = 'overview' | 'profile' | 'sessions' | 'guidance';

const SHORTCUT = 'group rounded-[1.25rem] border border-(--color-border) bg-white p-5 shadow-(--shadow-1) transition-[border-color,box-shadow] hover:border-brand-300 hover:shadow-(--shadow-2)';
const SHORTCUT_ICON = 'flex h-11 w-11 items-center justify-center rounded-full bg-brand-50 text-brand-700';
interface Registration { id: string; status: string; webinars?: { slug: string; title: string; starts_at: string; duration_minutes: number; status: string } | null }

// Account, as tabs within the page (Profile / Sessions) - mirrors the admin page pattern,
// replacing the old nav dropdown.
export function AccountTabs({
  userId,
  fullName,
  email,
  phone,
  summary,
  role,
  registrations,
}: {
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  summary: string;
  role: string;
  registrations: Registration[];
}) {
  const [tab, setTab] = useState<Tab>('overview');
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'guidance', label: 'Guidance' },
    { key: 'profile', label: 'Profile' },
  ];

  return (
    <div>
      <div className="mt-8 -mx-4 px-4 sm:mx-0 sm:px-0 flex items-center gap-1 border-b border-(--color-border) overflow-x-auto overflow-y-hidden">
        {tabs.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`shrink-0 px-4 py-3 text-[15px] font-semibold -mb-px border-b-2 transition-colors ${
              tab === x.key ? 'border-accent-600 text-brand-900' : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && <div className="grid gap-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/home?chat=open" className={SHORTCUT}><span className={SHORTCUT_ICON}><MessageCircle className="h-5 w-5"/></span><h2 className="mt-4 text-[17px] font-semibold text-brand-900">Ask Groovia</h2><p className="mt-1 text-[15px] leading-relaxed text-muted">Continue with a question or return to guidance.</p></Link>
            <Link href="/mentors" className={SHORTCUT}><span className={SHORTCUT_ICON}><UserRound className="h-5 w-5"/></span><h2 className="mt-4 text-[17px] font-semibold text-brand-900">Find a mentor</h2><p className="mt-1 text-[15px] leading-relaxed text-muted">Compare profiles, services, and availability.</p></Link>
            <Link href="/webinars" className={SHORTCUT}><span className={SHORTCUT_ICON}><Search className="h-5 w-5"/></span><h2 className="mt-4 text-[17px] font-semibold text-brand-900">Browse webinars</h2><p className="mt-1 text-[15px] leading-relaxed text-muted">Find a focused live session.</p></Link>
          </div>
          <Card className="rounded-[1.25rem] shadow-(--shadow-1)"><CardBody className="pt-6"><h2 className="flex items-center gap-2 text-lg font-semibold text-brand-900"><CalendarDays className="h-5 w-5 text-brand-600"/>Your upcoming webinars</h2>{registrations.filter((r) => r.status === 'confirmed' && r.webinars && new Date(r.webinars.starts_at) > new Date()).length ? <div className="mt-4 divide-y divide-(--color-border)">{registrations.filter((r) => r.status === 'confirmed' && r.webinars && new Date(r.webinars.starts_at) > new Date()).slice(0, 3).map((r) => <Link key={r.id} href={`/webinars/${r.webinars!.slug}`} className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"><span><strong className="block text-[15px] text-brand-900">{r.webinars!.title}</strong><span className="text-[13px] text-muted">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(r.webinars!.starts_at))}</span></span><span className="shrink-0 text-sm font-semibold text-brand-700">View →</span></Link>)}</div> : <p className="mt-3 text-[15px] text-muted">You have no upcoming webinar registrations. <Link href="/webinars" className="font-semibold text-brand-700 hover:text-brand-900">Browse webinars</Link></p>}</CardBody></Card>
        </div>}
        {tab === 'profile' && (
          <div className="grid gap-4 reveal-children">
            <Card className="rounded-[1.25rem] shadow-(--shadow-1)">
              <CardBody className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-800 text-lg font-semibold">
                      {(fullName?.[0] ?? email?.[0] ?? 'U').toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-[17px] font-semibold text-brand-900 truncate">{fullName || '-'}</h2>
                      <p className="text-[15px] text-muted truncate">{email}</p>
                    </div>
                  </div>
                  <Badge tone="brand">{role}</Badge>
                </div>
              </CardBody>
            </Card>

            <ProfileEditor userId={userId} initialFullName={fullName} initialPhone={phone} initialSummary={summary} />
          </div>
        )}

        {tab === 'sessions' && <BookingManager role="mentee" />}
        {tab === 'guidance' && <div><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><p className="text-[15px] text-muted">Your saved Groovia conversations.</p><Link href="/home?chat=open" className="text-sm font-semibold text-brand-700 hover:text-brand-900">New conversation →</Link></div><HistoryList open /></div>}
      </div>
    </div>
  );
}