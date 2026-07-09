'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Wrench } from 'lucide-react';
import { Card, CardBody } from './ui/Card';
import { ServicesManager } from './ServicesManager';
import { AvailabilityManagerV2 } from './AvailabilityManagerV2';
import { BookingManager } from './BookingManager';
import { COUNTRIES } from '../lib/countries';
import { LANGUAGES } from '../lib/languages';
import { RichText } from './ui/RichText';
import { cn } from '../lib/utils';

const COUNTRY_MAP = Object.fromEntries(COUNTRIES.map((c) => [c.code, c.name]));
const LANGUAGE_MAP = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.name]));

export interface HubMentor {
  slug: string;
  display_name: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'suspended' | 'changes_requested';
  rejection_reason?: string | null;
  pending_submitted_at?: string | null;
  headline?: string | null;
  bio?: string | null;
  photo_url?: string | null;
  country?: string | null;
  city?: string | null;
  languages?: string[];
  expertise_country_codes?: string[];
  professional_domains?: string[];
  years_lived_experience?: number | null;
  public_notes?: string | null;
}

type TabId = 'profile' | 'availability' | 'sessions' | 'payments' | 'webinars';

export function MentorHubTabs({ mentor }: { mentor: HubMentor }) {
  const approved = mentor.status === 'approved';
  const tabs: { id: TabId; label: string }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'availability', label: 'Availability' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'payments', label: 'Payments' },
    { id: 'webinars', label: 'Webinars' },
  ];
  const [tab, setTab] = useState<TabId>('profile');

  return (
    <div className="flex flex-col gap-6">
      <StatusBanner mentor={mentor} />

      <div>
        <div className="flex gap-1 border-b border-[--color-border] overflow-x-auto overflow-y-hidden -mx-1 px-1">
          {tabs.map((t) => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={cn('shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === t.id ? 'border-brand-600 text-brand-900' : 'border-transparent text-muted hover:text-foreground')}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'profile' && <ProfileTab mentor={mentor} />}
          {tab === 'availability' && (
            <div className="flex flex-col gap-8">
              <section className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-foreground">Session types</h2>
                <ServicesManager />
              </section>
              <section className="flex flex-col gap-4">
                <h2 className="text-base font-semibold text-foreground">Schedule</h2>
                <AvailabilityManagerV2 />
              </section>
            </div>
          )}
          {tab === 'sessions' && (
            approved
              ? <BookingManager role="mentor" />
              : <Card><CardBody className="pt-6"><p className="text-sm text-muted">Your booked sessions will appear here once your application is approved.</p></CardBody></Card>
          )}
          {tab === 'payments' && <UnderDevelopment title="Payments" note="Earnings, payout details, and history will live here." />}
          {tab === 'webinars' && <UnderDevelopment title="Webinars" note="Host group sessions and webinars for multiple attendees." />}
        </div>
      </div>
    </div>
  );
}

function StatusBanner({ mentor }: { mentor: HubMentor }) {
  if (mentor.status === 'pending_review') {
    return (
      <Card><CardBody className="pt-6">
        <h2 className="text-base font-semibold text-foreground">Application under review</h2>
        <p className="text-sm text-muted mt-1">Our team is reviewing your profile; this usually takes 1-2 business days.</p>
      </CardBody></Card>
    );
  }
  if (mentor.status === 'changes_requested') {
    return (
      <Card><CardBody className="pt-6">
        <h2 className="text-base font-semibold text-foreground">Changes requested</h2>
        <p className="text-sm text-muted mt-1">Our reviewer has asked for a few updates before approving your profile.</p>
        {mentor.rejection_reason && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">What to change</p>
            <p className="text-sm text-amber-900 mt-1 whitespace-pre-line">{mentor.rejection_reason}</p>
          </div>
        )}
        <p className="text-sm text-muted mt-3">
          <Link href="/mentor/profile" className="text-brand-700 hover:underline">Edit your profile</Link>, then re-submit for approval.
        </p>
      </CardBody></Card>
    );
  }
  if (mentor.status === 'rejected') {
    return (
      <Card><CardBody className="pt-6">
        <h2 className="text-base font-semibold text-foreground">Application not approved</h2>
        {mentor.rejection_reason && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Reviewer note</p>
            <p className="text-sm text-amber-900 mt-1 whitespace-pre-line">{mentor.rejection_reason}</p>
          </div>
        )}
        <p className="text-sm text-muted mt-3">Update your profile and re-apply, or contact support.</p>
      </CardBody></Card>
    );
  }
  if (mentor.status === 'suspended') {
    return (
      <Card><CardBody className="pt-6">
        <h2 className="text-base font-semibold text-foreground">Account suspended</h2>
        <p className="text-sm text-muted mt-1">Your mentor account is currently suspended. Please contact support.</p>
      </CardBody></Card>
    );
  }
  // Approved + a revision staged for review.
  if (mentor.pending_submitted_at) {
    return (
      <Card><CardBody className="pt-6">
        <h2 className="text-base font-semibold text-foreground">Profile changes awaiting review</h2>
        <p className="text-sm text-muted mt-1">
          Your live profile is unchanged and still bookable. Your submitted edits go live once an admin approves them.{' '}
          <Link href="/mentor/profile" className="text-brand-700 hover:underline">Review or edit your changes</Link>
        </p>
      </CardBody></Card>
    );
  }
  // Approved + a reviewer note = a previous revision was not applied.
  if (mentor.rejection_reason) {
    return (
      <Card><CardBody className="pt-6">
        <h2 className="text-base font-semibold text-foreground">Your recent changes were not applied</h2>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Reviewer note</p>
          <p className="text-sm text-amber-900 mt-1 whitespace-pre-line">{mentor.rejection_reason}</p>
        </div>
        <p className="text-sm text-muted mt-3">
          Your live profile is unchanged.{' '}
          <Link href="/mentor/profile" className="text-brand-700 hover:underline">Update and re-submit</Link>
        </p>
      </CardBody></Card>
    );
  }
  return (
    <Card><CardBody className="pt-6">
      <h2 className="text-base font-semibold text-foreground">Your profile is live</h2>
      <p className="text-sm text-muted mt-1">
        Mentees can discover you.{' '}
        <Link href={`/mentors/${mentor.slug}`} className="text-brand-700 hover:underline">View public profile →</Link>
      </p>
    </CardBody></Card>
  );
}

function ProfileTab({ mentor }: { mentor: HubMentor }) {
  return (
    <Card>
      <CardBody className="pt-6 flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {mentor.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mentor.photo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-brand-100" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-brand-100" />
            )}
            <div>
              <p className="text-base font-semibold text-foreground">{mentor.display_name}</p>
              {mentor.headline && <p className="text-sm text-muted">{mentor.headline}</p>}
            </div>
          </div>
          <Link href="/mentor/profile" className="inline-flex items-center h-9 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors">
            Edit profile
          </Link>
        </div>

        {mentor.bio && (
          <Field label="About">
            <RichText html={mentor.bio} />
          </Field>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          {(mentor.country || mentor.city) && (
            <Field label="Location">{[mentor.city, mentor.country ? (COUNTRY_MAP[mentor.country] ?? mentor.country) : null].filter(Boolean).join(', ')}</Field>
          )}
          {mentor.languages?.length ? <Field label="Languages">{mentor.languages.map((l) => LANGUAGE_MAP[l] ?? l).join(', ')}</Field> : null}
          {mentor.expertise_country_codes?.length ? <Field label="Countries of expertise">{mentor.expertise_country_codes.map((c) => COUNTRY_MAP[c] ?? c).join(', ')}</Field> : null}
          {mentor.years_lived_experience != null && <Field label="Years lived abroad">{mentor.years_lived_experience}</Field>}
          {mentor.professional_domains?.length ? <Field label="Domains of expertise">{mentor.professional_domains.join(', ')}</Field> : null}
        </div>
        {mentor.public_notes && <Field label="Public notes"><p className="whitespace-pre-line">{mentor.public_notes}</p></Field>}
      </CardBody>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

function UnderDevelopment({ title, note }: { title: string; note: string }) {
  return (
    <Card>
      <CardBody className="pt-10 pb-10 flex flex-col items-center text-center gap-2">
        <div className="h-11 w-11 rounded-full bg-brand-50 flex items-center justify-center text-brand-600">
          <Wrench className="h-5 w-5" />
        </div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted max-w-sm">{note}</p>
        <span className="mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">Under development</span>
      </CardBody>
    </Card>
  );
}
