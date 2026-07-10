'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Video, Clock, XCircle, AlertCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

// Mirrors immigroov's /join/[token] waiting-room UX (0079_attendance_tracking.sql +
// 0081_join_token_exposure.sql), rebuilt with groovia's own component conventions.
// Currently dormant in practice: attendance_engine_enabled is 'false' and nothing
// schedules evaluate_attendance_after_grace_period yet (see MERGE/COMPLETION docs),
// but the join/check endpoints work standalone regardless - clicking a real join
// link (once one is emailed) correctly records attendance either way.

type WindowState = 'waiting' | 'open' | 'closed' | 'cancelled';
type PageState = 'loading' | 'invalid_token' | 'cancelled' | 'waiting' | 'ready' | 'joining' | 'already_joined' | 'closed' | 'error';

interface CheckResult {
  state: WindowState;
  slot_time: string;
  window_opens_at: string;
  window_closes_at: string;
  already_joined: boolean;
  meeting_url: string | null;
}

function countdown(targetIso: string): string {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return 'any moment now';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatSlot(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

export default function JoinPage() {
  const params = useParams();
  const token = params?.token as string;

  const [pageState, setPageState] = useState<PageState>('loading');
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [, forceTick] = useState(0); // re-render every second for the countdown
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // poll and scheduleNext call each other; a ref breaks the circular
  // reference (scheduleNext can't close over poll before poll is declared).
  const pollRef = useRef<() => void>(() => {});

  const scheduleNext = useCallback((delayMs: number) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => pollRef.current(), delayMs);
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/booking/join/${token}/check`, { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.detail || data.error || '');
        setPageState('invalid_token');
        return;
      }
      const c = data as CheckResult;
      setCheck(c);

      if (c.state === 'cancelled') { setPageState('cancelled'); return; }
      if (c.state === 'closed') { setPageState('closed'); return; }
      if (c.state === 'open') {
        setPageState(c.already_joined ? 'already_joined' : 'ready');
        // Keep polling gently in case status changes (e.g. mentor cancels mid-window).
        scheduleNext(20000);
        return;
      }
      // waiting
      setPageState('waiting');
      const msToOpen = new Date(c.window_opens_at).getTime() - Date.now();
      scheduleNext(msToOpen < 60000 ? 5000 : 20000);
    } catch {
      setErrMsg('Could not check this link. Please check your connection and try again.');
      setPageState('error');
    }
  }, [token, scheduleNext]);

  useEffect(() => { pollRef.current = poll; }, [poll]);

  useEffect(() => {
    if (!token) return;
    poll();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Tick every second while waiting, purely for the countdown display.
  useEffect(() => {
    if (pageState !== 'waiting') return;
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [pageState]);

  async function handleJoin() {
    setPageState('joining');
    try {
      const res = await fetch(`/api/booking/join/${token}`, { method: 'POST', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        setErrMsg(data.detail || data.error || '');
        setPageState('error');
        return;
      }
      const url = data?.meeting_url as string | undefined;
      if (!url) {
        setErrMsg("This session doesn't have a video link.");
        setPageState('error');
        return;
      }
      window.location.href = url;
    } catch {
      setErrMsg('Could not join. Please check your connection and try again.');
      setPageState('error');
    }
  }

  function handleRejoin() {
    if (check?.meeting_url) window.location.href = check.meeting_url;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      {pageState === 'loading' && (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mb-3 animate-pulse">
            <Video className="h-6 w-6" />
          </div>
          <p className="text-sm text-muted">Checking your join link…</p>
        </>
      )}

      {pageState === 'invalid_token' && (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-brand-900">Link not recognized</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            This join link doesn&apos;t match a session we can find. Double-check the link from your
            email, or contact support.
          </p>
        </>
      )}

      {pageState === 'cancelled' && (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
            <XCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-brand-900">This session was cancelled</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">There&apos;s nothing to join here.</p>
        </>
      )}

      {pageState === 'closed' && (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mb-3">
            <XCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-brand-900">This join window has closed</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">
            The link for this session is no longer active.
          </p>
        </>
      )}

      {pageState === 'waiting' && check && (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 mb-3">
            <Clock className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-brand-900">Not quite time yet</h1>
          <p className="text-sm text-muted mt-2">Your session is scheduled for</p>
          <p className="text-sm font-semibold text-foreground mt-1">{formatSlot(check.slot_time)}</p>
          <p className="text-xs text-muted mt-4">
            The join link opens in <span className="font-medium text-foreground">{countdown(check.window_opens_at)}</span>
          </p>
        </>
      )}

      {(pageState === 'ready' || pageState === 'joining') && (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <Video className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-brand-900">Ready to join</h1>
          <p className="text-sm text-muted mt-2">Your session is starting now.</p>
          <div className="mt-6">
            <Button variant="accent" size="lg" onClick={handleJoin} loading={pageState === 'joining'}>
              Join now
            </Button>
          </div>
        </>
      )}

      {pageState === 'already_joined' && (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 mb-3">
            <Video className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-brand-900">You&apos;re already in</h1>
          <p className="text-sm text-muted mt-2">Rejoin if your call disconnected.</p>
          <div className="mt-6">
            <Button variant="outline" size="lg" onClick={handleRejoin}>Rejoin</Button>
          </div>
        </>
      )}

      {pageState === 'error' && (
        <>
          <div className="mx-auto h-12 w-12 rounded-full bg-red-50 flex items-center justify-center text-red-500 mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-xl font-semibold text-brand-900">Something went wrong</h1>
          <p className="text-sm text-muted mt-2 leading-relaxed">{errMsg || 'Please try again.'}</p>
        </>
      )}

      <div className="mt-8">
        <Link href="/account/sessions" className="text-xs text-muted hover:text-foreground underline">
          Back to my sessions
        </Link>
      </div>
    </div>
  );
}
