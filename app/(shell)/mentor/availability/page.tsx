import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { backendBaseUrl } from '../../../../lib/backend';
import { AvailabilityManagerV2 } from '../../../../components/AvailabilityManagerV2';

export const metadata = { title: 'Availability - Immigroov Mentor' };

export default async function MentorAvailabilityPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/?auth=open&role=mentor&next=${encodeURIComponent('/mentor/availability')}`);
  }

  const mentorRes = await fetch(`${backendBaseUrl()}/mentor/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });
  if (!mentorRes.ok) {
    redirect('/mentor/onboarding');
  }

  const mentor: { status: string } = await mentorRes.json();
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
