import { RescheduleClient } from '../../../../../components/RescheduleClient';

export const metadata = { title: 'Reschedule - Immigroov' };

// Reschedule lives alongside the session detail (/session/[bookingId]) so both are in the same route
// tree - the old /account/sessions/[bookingId]/reschedule sat under a path with no detail page, which
// made session links there 404 (BUG-096).
export default async function ReschedulePage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <RescheduleClient bookingId={bookingId} />
    </div>
  );
}
