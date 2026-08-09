import { redirect } from 'next/navigation';
import { serverAuth } from '../../../lib/supabase/server';
import { serverGet } from '../../../lib/backend';
import { MentorLanding } from '../../../components/MentorLanding';
import { MentorHubTabs, type HubMentor } from '../../../components/MentorHubTabs';
import { type LegacySession } from '../../../components/PastSessions';
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

  let r = await serverGet<HubMentor>('/mentor/me', token);
  // BUG-067: a signed-in customer clicking "join as a mentor" often hit "page couldn't load", then a
  // reload worked. That's a backend cold start (Render spin-up) making the FIRST call fail with a
  // non-404; a single quick retry usually catches it once the server is warm, so the customer sails
  // straight to onboarding instead of seeing an error. A genuine 404 (no mentor row) is not retried.
  if (!r.ok && r.status !== 404) {
    await new Promise((res) => setTimeout(res, 1500));
    r = await serverGet<HubMentor>('/mentor/me', token);
  }

  // No mentor row yet -> finish onboarding first.
  if (r.status === 404) {
    redirect('/mentor/onboarding');
  }

  // Still unreachable after the retry: show a retry state (never a blank screen), with a support
  // fallback so a customer who can't get through can still ask us to enable their mentor account.
  if (!r.ok || !r.data) {
    return <PageLoadError retryHref="/mentor" title="We couldn't load your dashboard"
      supportEmail="support@immigroov.com" />;
  }

  const mentor = r.data;

  // The mentor's OWN imported past sessions (private, own-data endpoint), shown on the Sessions tab.
  const sessRes = await serverGet<{ sessions: LegacySession[] }>('/mentor/legacy-sessions', token);
  const legacySessions = sessRes.ok && sessRes.data ? sessRes.data.sessions : [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Mentor Dashboard</h1>
        <p className="text-sm text-muted mt-1">Welcome back, {mentor.display_name}.</p>
      </div>
      <MentorHubTabs mentor={mentor} legacySessions={legacySessions} />
    </div>
  );
}
