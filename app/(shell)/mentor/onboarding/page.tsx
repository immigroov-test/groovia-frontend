import { redirect } from 'next/navigation';
import { serverAuth } from '../../../../lib/supabase/server';
import { serverGet } from '../../../../lib/backend';
import { MentorOnboardingForm } from '../../../../components/MentorOnboardingForm';
import { PageLoadError } from '../../../../components/PageLoadError';

export const metadata = { title: 'Mentor Onboarding - Immigroov' };

// One application form, two ways in. A newcomer signs up first and lands here; an existing
// customer opens it from the nav and finds it prefilled. Either way they stay a customer until an
// admin approves the application: the role follows approval, not the form.
interface Profile {
  full_name?: string | null; display_name?: string | null; phone?: string | null;
  country_code?: string | null; timezone?: string | null;
}

export default async function MentorOnboardingPage() {
  const { user, token } = await serverAuth();

  if (!user) {
    redirect('/mentor?auth=open&role=mentor');
  }

  // A user with no token means the access token in the cookie has expired: serverGet answers 401
  // without reaching the backend. Sending them through auth fixes it.
  if (!token) {
    redirect(`/login?next=${encodeURIComponent('/mentor/onboarding')}`);
  }

  // Extra retries here (BUG-067): "join as a mentor" is a common first hit after idle, so it's the
  // most likely to catch a cold-starting backend. serverGet retries status-0 failures before failing.
  const r = await serverGet('/mentor/me', token, 12000, 2);
  // Already a mentor -> hub. Backend down (status 0) -> retry, don't show a form that
  // can't submit. A 404 (no mentor yet) is the normal path to the onboarding form.
  if (r.ok) {
    redirect('/mentor');
  }
  // ONLY a 404 means "signed in, no application yet". Everything else (401 from a missing or
  // expired token, 5xx, timeout) is a transient failure, not a fact about the account.
  if (r.status !== 404) {
    return <PageLoadError retryHref="/mentor/onboarding" status={r.status}
      supportEmail="support@immigroov.com" />;
  }

  // Prefill from what the account already holds. Best-effort: a failed read just means an empty
  // form, which is what a brand-new signup gets anyway.
  const me = await serverGet<Profile>('/auth/me', token);
  const prof = me.ok && me.data ? me.data : {};
  const defaultName: string = prof.display_name
    ?? prof.full_name
    ?? user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? '';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <MentorOnboardingForm
        defaultName={defaultName}
        defaultPhone={prof.phone ?? ''}
        defaultCountry={prof.country_code ?? ''}
        defaultTimezone={prof.timezone ?? ''}
        userId={user.id}
      />
    </div>
  );
}
