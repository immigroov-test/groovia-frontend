import { redirect } from 'next/navigation';
import { serverAuth } from '../../../../lib/supabase/server';

export const metadata = { title: 'Become a Mentor - Immigroov' };

// The old all-fields signup form is replaced by the email-first login popup (mentor
// mode). Keep this route working for old links: logged-in users go straight to the
// onboarding form; logged-out users open the mentor sign-in popup.
export default async function MentorRegisterPage() {
  const { user } = await serverAuth();

  if (user) {
    redirect('/mentor/onboarding');
  }
  redirect('/mentor?auth=open&role=mentor');
}
