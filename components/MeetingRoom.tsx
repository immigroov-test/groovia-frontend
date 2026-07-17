'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Video, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { createClient } from '../lib/supabase/client';
import { loadJitsi, type JitsiApi } from '../lib/jitsi';

interface RoomInfo {
  open: boolean;
  reason?: 'early' | 'ended';
  domain?: string;
  room?: string;
  party?: 'candidate' | 'mentor';
  display_name?: string;
  other_name?: string;
  slot_time?: string;
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

export function MeetingRoom({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [state, setState] = useState<State>('loading');
  const [info, setInfo] = useState<RoomInfo | null>(null);
  const [errMsg, setErrMsg] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiApi | null>(null);

  const checkRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/booking/${bookingId}/room`, { headers: await authHeaders(), cache: 'no-store' });
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

  // Embed Jitsi once the room is open.
  useEffect(() => {
    if (state !== 'open' || !info?.room || !info.domain || !containerRef.current) return;
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
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: info.display_name || '' },
        configOverwrite: { prejoinPageEnabled: false, disableDeepLinking: true, startWithAudioMuted: false },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false, SHOW_JITSI_WATERMARK: false, SHOW_CHROME_EXTENSION_BANNER: false },
      });
      apiRef.current = api;
      const post = (event: 'joined' | 'left') => {
        fetch(`/api/booking/${bookingId}/attendance`, {
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

  if (state === 'open') {
    // Fill the viewport below the fixed top nav.
    return <div ref={containerRef} className="fixed inset-x-0 bottom-0 top-16 bg-black" />;
  }

  const Shell = ({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) => (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mx-auto h-14 w-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mb-4">{icon}</div>
      <h1 className="text-2xl font-semibold tracking-tight text-brand-900">{title}</h1>
      {children}
      <div className="mt-6"><Link href="/account/sessions"><Button variant="outline">Back to my sessions</Button></Link></div>
    </div>
  );

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
        <p className="text-xs text-muted mt-3">This page checks automatically — no need to refresh.</p>
        <div className="mt-4"><Button variant="ghost" onClick={() => void checkRoom()}>Check now</Button></div>
      </Shell>
    );
  }
  if (state === 'ended') {
    return <Shell icon={<Video className="h-7 w-7" />} title="This session has ended"><p className="text-sm text-muted mt-2">The video room for this session is closed.</p></Shell>;
  }
  return <Shell icon={<Video className="h-7 w-7" />} title="Can’t open this session"><p className="text-sm text-red-600 mt-2">{errMsg}</p></Shell>;
}
