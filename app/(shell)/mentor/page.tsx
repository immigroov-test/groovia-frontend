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

  // serverAuth can hand back a user with a NULL token when the access token in the cookie has
  // expired: getUser() revalidates over the network and succeeds, while getSession() reads the
  // cookie and comes back empty, and a server component cannot write the rotated cookie back.
  // serverGet then returns 401 without calling the backend at all. That is a session problem, and
  // sending the person through auth fixes it, where retrying and an error page never can. This was
  // previously blamed on a Render cold start, which it is not: it reproduces on a warm backend.
  if (!token) {
    redirect(`/login?next=${encodeURIComponent('/mentor')}`);
  }

  let r = await serverGet<HubMentor>('/mentor/me', token);
  // Retry only genuinely transient failures (status 0 = network error or timeout). A real HTTP
  // status is an answer, not a blip, so retrying it just doubles the wait before the same result.
  if (r.status === 0) {
    await new Promise((res) => setTimeout(res, 1500));
    r = await serverGet<HubMentor>('/mentor/me', token);
  }

  // No mentor row yet -> finish onboarding first.
  if (r.status === 404) {
    redirect('/mentor/onboarding');
  }

  // Anything else: a retry state rather than a blank screen, and show the status. Without it this
  // page reports every failure identically, which is exactly why the real cause stayed hidden.
  if (!r.ok || !r.data) {
    return <PageLoadError retryHref="/mentor" title="We couldn't load your dashboard"
      status={r.status} supportEmail="support@immigroov.com" />;
  }

  const mentor = r.data;

  // The mentor's OWN imported past sessions (private, own-data endpoint), shown on the Sessions tab.
  const sessRes = await serverGet<{ sessions: LegacySession[] }>('/mentor/legacy-sessions', token);
  const legacySessions = sessRes.ok && sessRes.data ? sessRes.data.sessions : [];

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-brand-900">Mentor dashboard</h1>
        <p className="text-sm text-muted mt-1">Welcome back, {mentor.display_name}.</p>
      </div>
      <MentorHubTabs mentor={mentor} legacySessions={legacySessions} />
    </div>
  );
}
