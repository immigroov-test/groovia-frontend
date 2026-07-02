import Link from 'next/link';
import { Video } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

export const metadata = { title: 'Video call — Immigroov' };

// Placeholder join page. A real video link (Jitsi/Meet/Daily) will be wired here later;
// for now the "Join meeting" buttons and emails point at this page.
export default async function MeetingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mb-4">
        <Video className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Your video call</h1>
      <p className="text-sm text-muted mt-2 leading-relaxed">
        The link for this session will appear here shortly before it starts, and you&apos;ll
        also receive it by email. Please check back closer to your session time.
      </p>
      <p className="text-xs text-muted mt-5">Booking ref: <code>{bookingId}</code></p>
      <div className="mt-6">
        <Link href="/account/sessions"><Button variant="outline">Back to my sessions</Button></Link>
      </div>
    </div>
  );
}
