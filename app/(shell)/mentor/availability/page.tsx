import { redirect } from 'next/navigation';
import { serverAuth } from '../../../../lib/supabase/server';
import { serverGet } from '../../../../lib/backend';
import { AvailabilityManagerV2 } from '../../../../components/AvailabilityManagerV2';
import { MentorOnboardingAvailability } from '../../../../components/MentorOnboardingAvailability';
import { PageLoadError } from '../../../../components/PageLoadError';
import { type CurrencyRate } from '../../../../lib/pricing';

export const metadata = { title: 'Availability - Immigroov Mentor' };

interface AvailMentor {
  display_name?: string;
  status: string;
  needs_onboarding?: boolean;
  currency?: string | null;
  hourly_rate?: number | null;
  currency_rates?: CurrencyRate[] | null;
  smart_pricing?: boolean | null;
}

export default async function MentorAvailabilityPage() {
  const { user, token } = await serverAuth();

  if (!user) {
    redirect(`/?auth=open&role=mentor&next=${encodeURIComponent('/mentor/availability')}`);
  }

  const r = await serverGet<AvailMentor>('/mentor/me', token);
  if (r.status === 404) {
    redirect('/mentor/onboarding');
  }
  if (!r.ok || !r.data) {
    return <PageLoadError retryHref="/mentor/availability" />;
  }

  const mentor = r.data;
  if (mentor.status !== 'approved' && mentor.status !== 'pending_review') {
    redirect('/mentor');
  }

  // Migrated mentor still finishing first-login setup: this is step 2 (rate + sessions + schedule).
  // Driven by the server flag, not the query param, so landing here directly still shows the flow.
  if (mentor.needs_onboarding) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Finish your setup</h1>
        <p className="text-sm text-muted mt-1">Set your rate, confirm your sessions and hours, then you&apos;re live.</p>
        <div className="mt-8">
          <MentorOnboardingAvailability mentor={mentor} />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Availability</h1>
      <p className="text-sm text-muted mt-1">
        {mentor.status === 'pending_review'
          ? "Set your weekly hours now; they go live the moment your application is approved."
          : 'Set the times when mentees can book sessions with you.'}
      </p>
      <div className="mt-8">
        <AvailabilityManagerV2 />
      </div>
    </div>
  );
}
