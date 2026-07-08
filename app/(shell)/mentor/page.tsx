import { redirect } from 'next/navigation';
import { createClient } from '../../../lib/supabase/server';
import { backendBaseUrl } from '../../../lib/backend';
import { MentorLanding } from '../../../components/MentorLanding';
import { MentorHubTabs, type HubMentor } from '../../../components/MentorHubTabs';

export const metadata = { title: 'Mentor Dashboard - Immigroov' };

export default async function MentorPage() {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
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

  const res = await fetch(`${backendBaseUrl()}/mentor/me`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
    cache: 'no-store',
  });

  // No mentor row yet -> finish onboarding first.
  if (!res.ok) {
    redirect('/mentor/onboarding');
  }

  const mentor: HubMentor = await res.json();

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
