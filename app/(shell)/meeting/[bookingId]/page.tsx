import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Video, Calendar, MessageSquare } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import { PageLoadError } from '../../../../components/PageLoadError';
import { serverAuth } from '../../../../lib/supabase/server';
import { serverGet } from '../../../../lib/backend';

export const metadata = { title: 'Video call - Immigroov' };

interface MeetingInfo {
  id: string;
  status: string;
  slot_time: string | null;
  slot_end: string | null;
  meeting_url: string | null;
  service_title: string | null;
  mentor_name: string | null;
  candidate_name: string | null;
  viewer_role: 'mentor' | 'candidate';
}

function formatSlot(slotTime: string | null): string {
  if (!slotTime) return '';
  return new Date(slotTime).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default async function MeetingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = await params;
  const { user, token } = await serverAuth();

  if (!user) {
    redirect(`/?auth=open&next=${encodeURIComponent(`/meeting/${bookingId}`)}`);
  }

  const r = await serverGet<MeetingInfo>(`/booking/${bookingId}/meeting`, token);

  if (r.status === 404 || r.status === 403) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">Session not found</h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          This meeting link isn&apos;t valid, or it isn&apos;t associated with your account.
        </p>
        <div className="mt-6">
          <Link href="/account/sessions"><Button variant="outline">Back to my sessions</Button></Link>
        </div>
      </div>
    );
  }
  if (!r.ok || !r.data) {
    return <PageLoadError retryHref={`/meeting/${bookingId}`} />;
  }

  const info = r.data;
  const sessionLabel = info.service_title || '1-on-1 session';
  const otherParty = info.viewer_role === 'candidate' ? info.mentor_name : info.candidate_name;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      <div className="text-center mb-6">
        <div className="mx-auto h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mb-3">
          {info.meeting_url ? <Video className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-brand-900">{sessionLabel}</h1>
        {info.slot_time && (
          <p className="text-sm text-muted mt-1 flex items-center justify-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> {formatSlot(info.slot_time)}
          </p>
        )}
        {otherParty && <p className="text-xs text-muted mt-1">with {otherParty}</p>}
      </div>

      {info.meeting_url ? (
        <div className="rounded-2xl border border-[--color-border] overflow-hidden bg-black" style={{ aspectRatio: '16 / 9' }}>
          <iframe
            src={info.meeting_url}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="w-full h-full border-0"
            title="Video call"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-[--color-border] bg-white p-8 text-center">
          <p className="text-sm text-muted leading-relaxed">
            This session doesn&apos;t include a video call — it&apos;s a direct-message session, handled
            through your <Link href="/chat" className="underline hover:text-foreground">messages</Link>.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {info.meeting_url && (
          <a href={info.meeting_url} target="_blank" rel="noopener noreferrer">
            <Button variant="outline">Open in a new tab</Button>
          </a>
        )}
        <Link href="/account/sessions"><Button variant="ghost">Back to my sessions</Button></Link>
      </div>
    </div>
  );
}
