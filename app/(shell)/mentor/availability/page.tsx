import { redirect } from 'next/navigation';
import { serverAuth } from '../../../../lib/supabase/server';
import { serverGet } from '../../../../lib/backend';
import { AvailabilityManagerV2 } from '../../../../components/AvailabilityManagerV2';
import { PageLoadError } from '../../../../components/PageLoadError';

export const metadata = { title: 'Availability - Immigroov Mentor' };

export default async function MentorAvailabilityPage() {
  const { user, token } = await serverAuth();

  if (!user) {
    redirect(`/?auth=open&role=mentor&next=${encodeURIComponent('/mentor/availability')}`);
  }

  const r = await serverGet<{ status: string }>('/mentor/me', token);
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
