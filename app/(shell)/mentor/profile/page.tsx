import { redirect } from 'next/navigation';
import { serverAuth } from '../../../../lib/supabase/server';
import { serverGet } from '../../../../lib/backend';
import { MentorProfileEditForm } from '../../../../components/MentorProfileEditForm';
import type { MentorProfile } from '../../../../components/MentorProfileEditForm';
import { PageLoadError } from '../../../../components/PageLoadError';

export const metadata = { title: 'Edit Profile - Immigroov Mentor' };

export default async function MentorProfilePage() {
  const { user, token } = await serverAuth();

  if (!user) {
    redirect(`/?auth=open&role=mentor&next=${encodeURIComponent('/mentor/profile')}`);
  }

  const r = await serverGet<MentorProfile>('/mentor/me', token);
  if (r.status === 404) {
    redirect('/mentor/onboarding');
  }
  if (!r.ok || !r.data) {
    return <PageLoadError retryHref="/mentor/profile" />;
  }

  const onboarding = !!r.data.needs_onboarding;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-semibold tracking-tight text-brand-900">
        {onboarding ? 'Review your profile' : 'Edit profile'}
      </h1>
      <div className="mt-6">
        <MentorProfileEditForm mentor={r.data} userId={user.id} onboarding={onboarding} />
      </div>
    </div>
  );
}
