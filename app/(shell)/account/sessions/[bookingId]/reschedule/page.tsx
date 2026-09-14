import { RescheduleClient } from '../../../../../../components/RescheduleClient';

export const metadata = { title: 'Reschedule - Immigroov' };

export default async function ReschedulePage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12">
      <RescheduleClient bookingId={bookingId} />
    </div>
  );
}
