import { redirect } from 'next/navigation';
import { createClient } from '../../../../lib/supabase/server';
import { MeetingRoom } from '../../../../components/MeetingRoom';

export const metadata = { title: 'Video call - Immigroov' };

// The room itself is auth- and time-gated on the backend; this just ensures the
// visitor is logged in before we mount the client meeting component.
export default async function MeetingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/meeting/${bookingId}`);
  return <MeetingRoom bookingId={bookingId} />;
}
