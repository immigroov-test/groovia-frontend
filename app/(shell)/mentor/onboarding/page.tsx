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

  // Extra retries here (BUG-067): "join as a mentor" is a common first hit after idle, so it's the
  // most likely to catch a cold-starting backend. serverGet retries status-0 failures before failing.
  const r = await serverGet('/mentor/me', token, 12000, 2);
  // Already a mentor -> hub. Backend down (status 0) -> retry, don't show a form that
  // can't submit. A 404 (no mentor yet) is the normal path to the onboarding form.
  if (r.ok) {
    redirect('/mentor');
  }
  if (r.status === 0) {
    return <PageLoadError retryHref="/mentor/onboarding" />;
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
