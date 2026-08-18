import { redirect } from 'next/navigation';
import { serverAuth } from '../../../../lib/supabase/server';
import { serverGet } from '../../../../lib/backend';
import { MentorOnboardingForm } from '../../../../components/MentorOnboardingForm';
import { PageLoadError } from '../../../../components/PageLoadError';

export const metadata = { title: 'Mentor Onboarding - Immigroov' };

// BUG-067: an existing customer account can't also become a mentor (one email is one or the other), so
// instead of dropping them on a signup form that can't work for them, send them to Contact with the
// "Join as a Mentor" topic prefilled and let support convert the account. `new=1` marks the genuine
// path: the mentor signup modal sets it right after the account is created.
const JOIN_AS_MENTOR_CONTACT =
  `/contact?topic=${encodeURIComponent('Join as a Mentor')}`
  + `&message=${encodeURIComponent('I want to join as a mentor.')}`;

export default async function MentorOnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { user, token } = await serverAuth();
  const { new: isFreshSignup } = await searchParams;

  if (!user) {
    redirect('/mentor?auth=open&role=mentor');
  }

  // A user with no token means the access token in the cookie has expired: serverGet answers 401
  // without reaching the backend, and this page used to read that as "customer account" and bounce a
  // legitimate new mentor to the Contact form. Carry new=1 through the round trip so a fresh signup
  // does not lose its marker and get misclassified on the way back.
  if (!token) {
    const back = isFreshSignup ? '/mentor/onboarding?new=1' : '/mentor/onboarding';
    redirect(`/login?next=${encodeURIComponent(back)}`);
  }

  // Extra retries here (BUG-067): "join as a mentor" is a common first hit after idle, so it's the
  // most likely to catch a cold-starting backend. serverGet retries status-0 failures before failing.
  const r = await serverGet('/mentor/me', token, 12000, 2);
  // Already a mentor -> hub. Backend down (status 0) -> retry, don't show a form that
  // can't submit. A 404 (no mentor yet) is the normal path to the onboarding form.
  if (r.ok) {
    redirect('/mentor');
  }
  // ONLY a 404 means "signed in, definitely not a mentor". Everything else (401 from a missing or
  // expired token, 5xx, timeout) says nothing about whether this is a customer account, and treating
  // it as one sent a legitimate new mentor to the contact form over a transient failure. Testing for
  // "not 404" instead of "is 404" is what made a session problem look like a customer account.
  if (r.status !== 404) {
    return <PageLoadError retryHref="/mentor/onboarding" status={r.status}
      supportEmail="support@immigroov.com" />;
  }
  // Signed in, no mentor profile, and not arriving from the mentor signup: this is a customer account.
  if (!isFreshSignup) {
    redirect(JOIN_AS_MENTOR_CONTACT);
  }

  const defaultName: string = user.user_metadata?.full_name
    ?? user.user_metadata?.name
    ?? '';

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <MentorOnboardingForm defaultName={defaultName} userId={user.id} />
    </div>
  );
}
