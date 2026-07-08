'use client';
import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Card, CardBody } from './ui/Card';
import { AdminMentorList } from './AdminMentorList';
import { AdminBookings } from './AdminBookings';
import { AdminPendingServices } from './AdminPendingServices';
import { UI_CONTENT } from '../lib/content';
import type { AdminMentor } from '../app/(shell)/admin/page';

interface Stats { pending_mentor_count: number; approved_mentor_count: number; total_bookings: number; }
type Tab = 'approval' | 'activity';

export function AdminDashboard({ stats, pending, approved, suspended }: {
  stats: Stats; pending: AdminMentor[]; approved: AdminMentor[]; suspended: AdminMentor[];
}) {
  const [tab, setTab] = useState<Tab>('approval');
  const t = UI_CONTENT.admin;
  const tabs: { key: Tab; label: string }[] = [
    { key: 'approval', label: `Approval${pending.length ? ` (${pending.length})` : ''}` },
    { key: 'activity', label: 'Activity' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-brand-900">{t.title}</h1>
          <p className="text-sm text-muted mt-1">{t.subtitle}</p>
        </div>
        <Link
          href="/admin/financials"
          className="shrink-0 h-9 px-4 rounded-full text-sm font-medium bg-brand-50 text-brand-900 hover:bg-brand-100 inline-flex items-center"
        >
          Payouts &amp; ledger
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <StatCard n={stats.pending_mentor_count} label="Pending review" />
        <StatCard n={stats.approved_mentor_count} label="Active mentors" />
        <StatCard n={stats.total_bookings} label="Total bookings" />
      </div>

      <div className="mt-8 flex items-center gap-1 border-b border-[--color-border]">
        {tabs.map((x) => (
          <button
            key={x.key}
            onClick={() => setTab(x.key)}
            className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
              tab === x.key ? 'border-brand-900 text-brand-900' : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {x.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'approval' && (
          <div className="flex flex-col gap-10">
            <Section title="Services awaiting approval" subtitle="New services added by approved mentors — review before they go live.">
              <AdminPendingServices />
            </Section>
            <Section title={t.pendingTitle} subtitle={t.pendingSubtitle}>
              <AdminMentorList initialMentors={pending} actions={[
                { action: 'reject', label: t.reject, variant: 'outline', loadingKey: 'reject' },
                { action: 'approve', label: t.approve, variant: 'accent', loadingKey: 'approve' },
              ]} />
            </Section>
            <Section title={t.activeTitle} subtitle={t.activeSubtitle}>
              <AdminMentorList initialMentors={approved} actions={[
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
        {tab === 'activity' && <AdminBookings />}
      </div>
    </div>
  );
}

function StatCard({ n, label }: { n: number; label: string }) {
  return (
    <Card><CardBody className="pt-5 pb-5">
      <p className="text-2xl font-bold text-foreground">{n}</p>
      <p className="text-xs text-muted mt-0.5">{label}</p>
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
