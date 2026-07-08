'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Card, CardBody } from './ui/Card';
import { ServicesManager } from './ServicesManager';
import { AvailabilityManagerV2 } from './AvailabilityManagerV2';
import { BookingManager } from './BookingManager';
import { cn } from '../lib/utils';

export interface HubMentor {
  slug: string;
  display_name: string;
  status: 'pending_review' | 'approved' | 'rejected' | 'suspended';
  rejection_reason?: string | null;
}

type TabId = 'overview' | 'availability' | 'sessions' | 'bookings' | 'profile';

export function MentorHubTabs({ mentor }: { mentor: HubMentor }) {
  const approved = mentor.status === 'approved';
  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'availability', label: 'Availability' },
    { id: 'sessions', label: 'Session types' },
    ...(approved ? [{ id: 'bookings' as const, label: 'Bookings' }] : []),
    { id: 'profile', label: 'Profile' },
  ];
  const [tab, setTab] = useState<TabId>('overview');

  return (
    <div>
      {/* Tab bar (scrolls horizontally on small screens; global top nav stays put) */}
      <div className="flex gap-1 border-b border-[--color-border] overflow-x-auto -mx-1 px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-brand-600 text-brand-900'
                : 'border-transparent text-muted hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === 'overview' && <Overview mentor={mentor} />}
        {tab === 'availability' && <AvailabilityManagerV2 />}
        {tab === 'sessions' && <ServicesManager />}
        {tab === 'bookings' && approved && <BookingManager role="mentor" />}
        {tab === 'profile' && (
          <Card>
            <CardBody className="pt-6 flex flex-col gap-3">
              <h2 className="text-base font-semibold text-foreground">Your profile</h2>
              <p className="text-sm text-muted">
                Update your photo, headline, bio, languages, and expertise. Changes to expertise
                require re-approval by our team.
              </p>
              <div>
                <Link
                  href="/mentor/profile"
                  className="inline-flex items-center h-9 px-4 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 transition-colors"
                >
                  Edit profile
                </Link>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

function Overview({ mentor }: { mentor: HubMentor }) {
  return (
    <div className="flex flex-col gap-4">
      {mentor.status === 'pending_review' && (
        <Card>
          <CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground">Application under review</h2>
            <p className="text-sm text-muted mt-1">
              Thanks for applying. Our team is reviewing your profile; this usually takes 1-2 business days.
              You can fine-tune your availability and session types from the tabs above in the meantime.
            </p>
          </CardBody>
        </Card>
      )}

      {mentor.status === 'rejected' && (
        <Card>
          <CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground">Application not approved</h2>
            <p className="text-sm text-muted mt-1">Your mentor application wasn&apos;t approved this time.</p>
            {mentor.rejection_reason && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Reviewer note</p>
                <p className="text-sm text-amber-900 mt-1 whitespace-pre-line">{mentor.rejection_reason}</p>
              </div>
            )}
            <p className="text-sm text-muted mt-3">
              You can update your profile from the Profile tab and re-apply, or contact support.
            </p>
          </CardBody>
        </Card>
      )}

      {mentor.status === 'suspended' && (
        <Card>
          <CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground">Account suspended</h2>
            <p className="text-sm text-muted mt-1">
              Your mentor account is currently suspended. Please contact support for more information.
            </p>
          </CardBody>
        </Card>
      )}

      {mentor.status === 'approved' && (
        <Card>
          <CardBody className="pt-6">
            <h2 className="text-base font-semibold text-foreground">Your profile is live</h2>
            <p className="text-sm text-muted mt-1">
              Mentees can discover you on the platform.{' '}
              <Link href={`/mentors/${mentor.slug}`} className="text-brand-700 hover:underline">
                View public profile →
              </Link>
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
