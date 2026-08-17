'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Video, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { Logo } from './ui/Logo';
import { createClient } from '../lib/supabase/client';
import { loadJitsi, type JitsiApi } from '../lib/jitsi';
import { ReviewForm } from './Reviews';
import { ConfirmDialog } from './ui/ConfirmDialog';

interface RoomInfo {
  open: boolean;
  reason?: 'early' | 'ended';
  domain?: string;
  room?: string;
  jwt?: string | null;   // JaaS room token; absent on the demo server (BUG-120)
  embed?: boolean;       // false on the public server, where an embedded call is cut at 5 minutes
  join_url?: string;     // the room opened directly, with no embed time cap
  party?: 'candidate' | 'mentor';
  /** Whether the viewer clicked Join. Post-call actions (review, no-show) unlock only once true, so
   *  nobody can report a no-show for a call they never opened themselves. */
  i_joined?: boolean;
  /** Whether the OTHER party joined, so the page can name who was missing rather than ask. */
  they_joined?: boolean;
  display_name?: string;
  other_name?: string;
  slot_time?: string;
  service_title?: string;
  duration?: number;
  opens_at?: string;
}

type State = 'loading' | 'error' | 'early' | 'ended' | 'open';

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await createClient().auth.getSession();
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {};
}

function fmt(iso?: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  catch { return iso; }
}

export function MeetingRoom({ bookingId, accessToken }: {
  bookingId: string;
  /** Signed token from the confirmation email; present for guests, absent for signed-in users. */
  accessToken?: string;
}) {
  const tq = accessToken ? `?t=${encodeURIComponent(accessToken)}` : '';
  const router = useRouter();
  // Set the moment Join is clicked, and seeded from i_joined on load so the actions survive a refresh
  // or a second visit. Clicking Join is what proves attendance, so nothing below unlocks before it.
  const [joined, setJoined] = useState(false);
  const [reportingNoShow, setReportingNoShow] = useState(false);
  const [noShowBusy, setNoShowBusy] = useState(false);
  const [noShowDone, setNoShowDone] = useState(false);
  const [state, setState] = useState<State>('loading');
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [errMsg, setErrMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);

  const checkRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/booking/${bookingId}/room${tq}`, { headers: await authHeaders(), cache: 'no-store' });
      if (res.status === 401) { router.push(`/login?next=/meeting/${bookingId}`); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setErrMsg(data.detail || 'This session can’t be opened.'); setState('error'); return; }
      setInfo(data as RoomInfo);
      setState(data.open ? 'open' : data.reason === 'ended' ? 'ended' : 'early');
    } catch {
      setErrMsg('Could not reach the server. Please check your connection.');
      setState('error');
    }
  }, [bookingId, router]);

  useEffect(() => { void checkRoom(); }, [checkRoom]);

  // While it's too early, re-check periodically so the room opens on its own.
  useEffect(() => {
    if (state !== 'early') return;
    const t = setInterval(() => void checkRoom(), 20000);
    return () => clearInterval(t);
  }, [state, checkRoom]);

  // Embed Jitsi once the room is open - but ONLY where embedding is actually allowed to run full
  // length. The public meet.jit.si server hangs up an EMBEDDED call after 5 minutes ("Embedding
  // meet.jit.si is only meant for demo purposes"), which killed every 30-minute session mid-call
  // (BUG-120). That cap does not apply to the same room opened directly, so without JaaS we hand the
  // call over to a normal tab instead of embedding a call we know will drop.
  useEffect(() => {
    if (state !== 'open' || !info?.embed || !info?.room || !info.domain || !containerRef.current) return;
    let disposed = false;
    let onHide: (() => void) | null = null;
    (async () => {
      const ok = await loadJitsi(info.domain!);
      if (disposed) return;
      if (!ok || !window.JitsiMeetExternalAPI || !containerRef.current) {
        setErrMsg('Could not load the video component.'); setState('error'); return;
      }
      // Capture the auth header once so a "left" beacon can still fire on abrupt
      // tab-close (when async session lookups wouldn't complete in time).
      const headers = await authHeaders();
      if (disposed) return;
      const api = new window.JitsiMeetExternalAPI(info.domain!, {
        roomName: info.room!,
        // Only present once JaaS is configured; the demo server rejects a token outright.
        ...(info.jwt ? { jwt: info.jwt } : {}),
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: info.display_name || '' },
        configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true, startWithAudioMuted: false },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false, SHOW_CHROME_EXTENSION_BANNER: false },
      });
      apiRef.current = api;
      const post = (event: 'joined' | 'left') => {
        fetch(`/api/booking/${bookingId}/attendance${tq}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
          body: JSON.stringify({ event }), keepalive: true,
        }).catch(() => {});
      };
      api.addListener('videoConferenceJoined', () => post('joined'));
      api.addListener('videoConferenceLeft', () => post('left'));
      api.addListener('readyToClose', () => router.push('/account/sessions'));
      onHide = () => post('left');
      window.addEventListener('pagehide', onHide);
    })();
    return () => {
      disposed = true;
      if (onHide) window.removeEventListener('pagehide', onHide);
      try { apiRef.current?.dispose(); } catch { /* noop */ }
      apiRef.current = null;
    };
  }, [state, info, bookingId, router]);

  if (state === 'open' && info?.embed) {
    // Fill the viewport below the fixed top nav.
    return <div ref={containerRef} className="fixed inset-x-0 bottom-0 top-16 bg-black" />;
  }

  // Guests reach this page straight from their confirmation email with no account, so it has to stand
  // on its own: branded, self-explanatory, and never offering a dashboard they cannot open. The header
  // stays centred (it is a status); the body opts into left alignment, because centred text breaks the
  // label/value column and leaves form actions with nothing to align to.
  // A token does NOT mean "guest": the mentor's emailed link carries one too, and treating them as a
  // guest showed them a "create a free account" prompt for an account they already have. Only the
  // customer side can be a guest, and only when they are not signed in.
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  useEffect(() => {
    createClient().auth.getSession().then(({ data }) => setHasSession(!!data.session));
  }, []);
  const isGuest = !!accessToken && info?.party === 'candidate' && hasSession === false;
  const isMentor = info?.party === 'mentor';
  const Shell = ({ icon, title, children, body = 'center' }: {
    icon: ReactNode; title: string; children: ReactNode; body?: 'center' | 'left';
  }) => (
    <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-14">
      {/* Branding: for a guest this page may be their only view of Immigroov outside an email. */}
      <div className="flex justify-center mb-8">
        <Link href="/" aria-label="Immigroov home">
          <Logo className="h-7 w-auto" />
        </Link>
      </div>

      <div className="text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mb-4">{icon}</div>
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-brand-900 text-balance">{title}</h1>
      </div>
      <div className={body === 'left' ? 'text-left' : 'text-center'}>{children}</div>

      <div className="mt-10 pt-6 border-t border-[--color-border] text-center">
        {isMentor ? (
          <Link href="/mentor" className="text-sm font-medium text-brand-700 hover:text-brand-900">
            Back to my mentor dashboard
          </Link>
        ) : isGuest ? (
          // A guest has no /account/sessions to go back to. Offer the thing that would actually help:
          // an account tied to the email they already booked with.
          <>
            <p className="text-xs text-muted leading-relaxed">
              You booked as a guest. Create a free account with the same email to manage this session
              and see it alongside any others.
            </p>
            <Link href="/home?auth=open"
              className="inline-block mt-3 text-sm font-medium text-brand-700 hover:text-brand-900">
              Create a free account
            </Link>
          </>
        ) : (
          <Link href="/account/sessions" className="text-sm font-medium text-brand-700 hover:text-brand-900">
            Back to my sessions
          </Link>
        )}
        <p className="mt-6 text-[11px] text-muted">
          Need help? <a href="mailto:support@immigroov.com" className="underline">support@immigroov.com</a>
        </p>
      </div>
    </div>
  );

  // No embedding allowed (public server): launch the room in its own tab, which has no time cap.
  if (state === 'open') {
    const url = info?.join_url ?? '';
    const isCandidate = info?.party === 'candidate';
    // Attendance is what no-show detection reads, so it must be recorded with the auth header. The
    // plain fetch here had none, which meant the stamp was silently dropped on the tab path.
    const recordJoin = async () => {
      setJoined(true);
      try {
        await fetch(`/api/booking/${bookingId}/attendance${tq}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
          body: JSON.stringify({ event: 'joined' }),
        });
      } catch { /* the call still matters more than the stamp */ }
    };
    const canAct = joined || info?.i_joined;
    const endsAt = info?.slot_time && info?.duration
      ? new Date(new Date(info.slot_time).getTime() + info.duration * 60_000)
      : null;
    const sessionEnded = !!endsAt && Date.now() >= endsAt.getTime();
    return (
      <Shell icon={<Video className="h-6 w-6" />} title="Your video call is ready" body="left">
        {/* The same facts as the confirmation email, so nobody has to cross-reference their inbox.
            Definition list rather than a table: it stacks cleanly on a phone. */}
        <dl className="mt-6 rounded-xl bg-brand-50/50 divide-y divide-[--color-border] overflow-hidden">
          {([
            info?.service_title && ['Session', <span key="s" className="font-medium">{info.service_title}</span>],
            ['Scheduled for', `${fmt(info?.slot_time)}${info?.duration ? ` · ${info.duration} min` : ''}`],
            [isCandidate ? 'Your mentor' : 'Attendee', info?.other_name],
            ['Reference', <span key="r" className="font-mono text-xs text-muted">{bookingId.slice(0, 8)}</span>],
          ].filter(Boolean) as [string, ReactNode][]).map(([label, value]) => (
            // grid, not flex-wrap: the label keeps its own column at every width instead of dropping
            // onto the line above the value, which is what made this look ragged.
            <div key={label} className="grid grid-cols-[6.5rem_1fr] gap-x-3 px-4 py-3 items-baseline">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="text-sm text-foreground min-w-0 break-words">{value}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-6">
          <a href={url} target="_blank" rel="noopener noreferrer" onClick={() => { void recordJoin(); }}
            className="block">
            <Button size="lg" className="w-full justify-center">
              <Video className="h-4 w-4" /> Join the call
            </Button>
          </a>
          <p className="text-xs text-muted mt-2.5 leading-relaxed">
            Opens in a new tab. Keep this page open to come back here afterwards.
            {joined && ' You can rejoin from this button at any time during the session.'}
          </p>
        </div>

        {/* Post-call actions, so nobody has to find the session detail page. Only after Join: reporting
            a no-show puts a strike on a mentor, so it must not be available to someone who never
            opened the call themselves. */}
        {canAct && (
          <div className="mt-10 pt-6 border-t border-[--color-border]">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">After your call</p>
            <p className="text-xs text-muted mt-1 mb-4 leading-relaxed">
              These become useful once the session is over. Nothing here is sent until you choose it.
            </p>

            {noShowDone ? (
              <p className="text-sm text-emerald-700 mt-3 leading-relaxed">
                No-show reported. We have emailed both of you, and you can resolve it from your sessions.
              </p>
            ) : (
              <div className="mt-3">
                {/* The name stays out of the control: a button that reads like an accusation is easy to
                    press by accident. State the situation, then offer the action. */}
                <p className="text-sm text-foreground">
                  {isCandidate
                    ? 'The mentor did not show up for the meeting?'
                    : 'The attendee did not show up for the meeting?'}
                </p>
                <div className="mt-2">
                  <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50"
                    onClick={() => setReportingNoShow(true)}>
                    Report no-show
                  </Button>
                </div>
              </div>
            )}

            {/* Only after the session has actually ENDED. It used to appear the moment Join was
                clicked, inviting someone to review a call that had not happened yet. */}
            {isCandidate && sessionEnded && (
              <div className="mt-8 pt-6 border-t border-[--color-border]">
                <p className="text-sm font-medium text-foreground">How was your session?</p>
                <p className="text-xs text-muted mt-1 mb-3">Only the overall rating is required.</p>
                <ReviewForm bookingId={bookingId} />
              </div>
            )}
          </div>
        )}

        <ConfirmDialog
          open={reportingNoShow} busy={noShowBusy}
          onClose={() => setReportingNoShow(false)}
          title={isCandidate ? 'Report that your mentor did not join?' : 'Report that the attendee did not join?'}
          body={isCandidate
            ? <><strong>Please wait 5 to 10 minutes past the start time first.</strong> People are often
                a few minutes late, and the room stays open for 30 minutes after the session ends.
                <br /><br />
                If you report it, we email you both and open a resolution: a refund or a rebook. It also
                counts against the mentor, so only report a genuine no-show.</>
            : <><strong>Please wait 5 to 10 minutes past the start time first.</strong> People are often
                a few minutes late, and the room stays open for 30 minutes after the session ends.
                <br /><br />
                If you report it, we email you both and open a resolution.</>}
          confirmLabel="Yes, report a no-show"
          alternateLabel="I&rsquo;ll wait a bit longer"
          reason={{ label: 'What happened?', placeholder: 'e.g. waited 15 minutes, nobody joined', required: true }}
          onConfirm={async (reason) => {
            setNoShowBusy(true);
            try {
              const res = await fetch('/api/booking/no-show/flag', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
                body: JSON.stringify({ booking_id: bookingId,
                                       no_show_party: isCandidate ? 'mentor' : 'user',
                                       reason }),
              });
              if (res.ok) { setNoShowDone(true); setReportingNoShow(false); }
              else { setErrMsg('Could not report that. Please try from your sessions page.'); }
            } catch { setErrMsg('Could not report that. Please try from your sessions page.'); }
            finally { setNoShowBusy(false); }
          }}
        />
      </Shell>
    );
  }

  if (state === 'loading') {
    return <Shell icon={<Loader2 className="h-7 w-7 animate-spin" />} title="Opening your video call…"><p className="text-sm text-muted mt-2">One moment.</p></Shell>;
  }
  if (state === 'early') {
    return (
      <Shell icon={<Clock className="h-7 w-7" />} title="Your room isn’t open yet">
        <p className="text-sm text-muted mt-2 leading-relaxed">
          The video room opens <strong>5 minutes before</strong> your session
          {info?.slot_time && <> ({fmt(info.slot_time)})</>}.
          {info?.other_name && <> You’ll meet <strong>{info.other_name}</strong>.</>}
        </p>
        <p className="text-xs text-muted mt-3">This page checks automatically, no need to refresh.</p>
        <div className="mt-4"><Button variant="ghost" onClick={() => void checkRoom()}>Check now</Button></div>
      </Shell>
    );
  }
  if (state === 'ended') {
    // TODO(next): the review and no-show actions from the session detail page belong here, gated on
    // info.i_joined, with info.they_joined used to pre-empt who was missing. Until they are wired,
    // this at least stops being a dead end and points at the page that does have them.
    return (
      <Shell icon={<Video className="h-7 w-7" />} title="This session has ended">
        <p className="text-sm text-muted mt-2 leading-relaxed">
          {info?.i_joined && info?.they_joined === false
            ? <>It looks like {info.other_name} didn&apos;t join. You can report that from your sessions.</>
            : <>The video room for this session is closed.</>}
        </p>
        <div className="mt-6"><Link href="/account/sessions"><Button>Go to my sessions</Button></Link></div>
      </Shell>
    );
  }
  return <Shell icon={<Video className="h-7 w-7" />} title="Can’t open this session"><p className="text-sm text-red-600 mt-2">{errMsg}</p></Shell>;
}
