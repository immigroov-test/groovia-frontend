import { redirect } from 'next/navigation';
import { serverAuth } from '../../../lib/supabase/server';
import { serverGet } from '../../../lib/backend';
import { MentorLanding } from '../../../components/MentorLanding';
import { MentorHubTabs, type HubMentor } from '../../../components/MentorHubTabs';
import { PageLoadError } from '../../../components/PageLoadError';

export const metadata = { title: 'Mentor Dashboard - Immigroov' };

export default async function MentorPage() {
  const { user, token } = await serverAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-brand-900">Become a mentor</h1>
          <p className="text-base text-muted mt-2">Help immigrants navigate their career journey.</p>
        </div>
        <MentorLanding />
      </div>
    );
  }

  const r = await serverGet<HubMentor>('/mentor/me', token);

  // No mentor row yet -> finish onboarding first.
  if (r.status === 404) {
    redirect('/mentor/onboarding');
  }

  // Backend unreachable (e.g. Render cold start) or an unexpected error: show a retry
  // state instead of crashing the RSC to a blank screen.
  if (!r.ok || !r.data) {
    return <PageLoadError retryHref="/mentor" title="We couldn't load your dashboard" />;
  }

  const mentor = r.data;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Mentor Dashboard</h1>
        <p className="text-sm text-muted mt-1">Welcome back, {mentor.display_name}.</p>
      </div>
      <MentorHubTabs mentor={mentor} />
    </div>
  );
}
