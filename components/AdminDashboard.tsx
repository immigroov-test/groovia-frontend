'use client';
import { useState, type ReactNode } from 'react';
import { Card, CardBody } from './ui/Card';
import { AdminMentorList } from './AdminMentorList';
import { AdminRevisionList, type AdminRevision } from './AdminRevisionList';
import { AdminBookings } from './AdminBookings';
import { AdminPayouts } from './AdminPayouts';
import { AdminPendingServices } from './AdminPendingServices';
import { AdminOps } from './AdminOps';
import { UI_CONTENT } from '../lib/content';
import { cn } from '../lib/utils';
import type { AdminMentor } from '../app/(shell)/admin/page';

type MentorFilter = 'all' | 'active' | 'inactive' | 'no_service';
const mentorCategory = (m: AdminMentor): 'active' | 'inactive' | 'no_service' =>
  m.is_active === false ? 'inactive' : m.bookable === false ? 'no_service' : 'active';

interface Stats { pending_mentor_count: number; approved_mentor_count: number; active_mentor_count: number; inactive_mentor_count: number; no_service_mentor_count: number; pending_service_count: number; total_bookings: number; global_commission_pct: number; }
type Tab = 'review' | 'mentors' | 'bookings' | 'payouts' | 'ops';

export function AdminDashboard({ stats, pending, approved, suspended, revisions }: {
  stats: Stats; pending: AdminMentor[]; approved: AdminMentor[]; suspended: AdminMentor[]; revisions: AdminRevision[];
}) {
  const [tab, setTab] = useState<Tab>('review');
  const [mentorFilter, setMentorFilter] = useState<MentorFilter>('all');
  const t = UI_CONTENT.admin;

  const mCounts = { all: approved.length, active: 0, inactive: 0, no_service: 0 };
  approved.forEach((m) => { mCounts[mentorCategory(m)]++; });
  const shownMentors = mentorFilter === 'all' ? approved : approved.filter((m) => mentorCategory(m) === mentorFilter);
  const reviewCount = pending.length + revisions.length + (stats.pending_service_count || 0);
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'review', label: 'Review', count: reviewCount || undefined },
    { key: 'mentors', label: 'Mentors', count: approved.length || undefined },
    { key: 'bookings', label: 'Bookings' },
    { key: 'payouts', label: 'Payouts' },
    { key: 'ops', label: 'Ops' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">{t.title}</h1>
      <p className="text-sm text-muted mt-1">{t.subtitle}</p>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard n={stats.pending_mentor_count} label="Pending review" />
        <StatCard n={stats.active_mentor_count} label="Active mentors" hint="visible to users" />
        <StatCard n={stats.inactive_mentor_count} label="Inactive" hint="hidden by admin" />
        <StatCard n={stats.no_service_mentor_count} label="No services" hint="nothing to book yet" />
        <StatCard n={stats.total_bookings} label="Total bookings" />
      </div>

      <p className="mt-3 text-xs text-muted">
        Platform commission <span className="font-semibold text-foreground">{stats.global_commission_pct}%</span> (set in
        backend, added to the mentor rate to get the customer price).
      </p>

      <div className="mt-8 flex items-center gap-1 border-b border-[--color-border] overflow-x-auto overflow-y-hidden">
        {tabs.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === x.key ? 'border-brand-900 text-brand-900' : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {x.label}{x.count ? ` (${x.count})` : ''}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'review' && (
          <div className="flex flex-col gap-10">
            <Section title={t.pendingTitle} subtitle={t.pendingSubtitle}>
              <AdminMentorList initialMentors={pending} actions={[
                { action: 'request-changes', label: t.requestChanges, variant: 'outline', loadingKey: 'request-changes' },
                { action: 'reject', label: t.decline, variant: 'outline', loadingKey: 'reject' },
                { action: 'approve', label: t.approve, variant: 'accent', loadingKey: 'approve' },
              ]} />
            </Section>
            <Section title="Profile updates" subtitle="Edits from approved mentors. Their live profile stays up until you approve the changes.">
              <AdminRevisionList initialRevisions={revisions} />
            </Section>
            <Section title="Session types awaiting review" subtitle="New session types added by live mentors. They only appear to users once you approve them.">
              <AdminPendingServices />
            </Section>
          </div>
        )}

        {tab === 'mentors' && (
          <div className="flex flex-col gap-10">
            <Section title={t.activeTitle} subtitle={t.activeSubtitle}>
              <div className="flex flex-wrap gap-2 mb-4">
                {([
                  ['all', 'All'], ['active', 'Active'], ['inactive', 'Inactive'], ['no_service', 'No services'],
                ] as const).map(([key, label]) => (
                  <button key={key} type="button" onClick={() => setMentorFilter(key)}
                    className={cn('rounded-full px-3 py-1 text-sm font-medium border transition-colors',
                      mentorFilter === key ? 'border-brand-600 bg-brand-50 text-brand-900' : 'border-[--color-border] text-muted hover:text-foreground')}>
                    {label} ({mCounts[key]})
                  </button>
                ))}
              </div>
              {/* key forces AdminMentorList to re-init its list from the filtered set on tag change */}
              <AdminMentorList key={mentorFilter} initialMentors={shownMentors} actions={[
                { action: 'suspend', label: t.suspend, variant: 'outline', loadingKey: 'suspend' },
              ]} />
            </Section>
            {suspended.length > 0 && (
              <Section title={t.suspendedTitle} subtitle={t.suspendedSubtitle}>
                <AdminMentorList initialMentors={suspended} actions={[
                  { action: 'reinstate', label: t.reinstate, variant: 'accent', loadingKey: 'reinstate' },
                ]} />
              </Section>
            )}
          </div>
        )}

        {tab === 'bookings' && <AdminBookings />}

        {tab === 'payouts' && <AdminPayouts />}

        {tab === 'ops' && (
          <Section title="No-show strikes" subtitle="Mentors with accrued no-show strikes. Reset if a dispute is resolved in their favour.">
            <AdminOps />
          </Section>
        )}
      </div>
    </div>
  );
}

function StatCard({ n, label, hint }: { n: number; label: string; hint?: string }) {
  return (
    <Card><CardBody className="pt-5 pb-5">
      <p className="text-2xl font-bold text-foreground">{n}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
      {hint && <p className="text-[11px] text-muted/70 mt-0.5">{hint}</p>}
    </CardBody></Card>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <p className="text-sm text-muted mt-0.5 mb-4">{subtitle}</p>
      {children}
    </section>
  );
}

