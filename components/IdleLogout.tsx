'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { FEATURES, IDLE_TIMEOUT_MINUTES } from '../lib/features';
import { clearLocalChat } from '../lib/chatStorage';
import { Button } from './ui/Button';

// Industry-standard idle timeout: sign the user out after a period of no interaction, with a
// short warning + countdown first ("Stay signed in"). Shared across tabs via localStorage, so
// the idle clock is one clock for the whole browser session.
//
// Fixes the old bug where `visibilitychange -> markActive` RESET the timer whenever a
// backgrounded tab was refocused (so an inactive tab effectively never timed out). Now
// refocusing only RE-CHECKS idle; it never counts as activity.

const LAST_ACTIVITY_KEY = 'groovia.lastActivity';
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'wheel'];
const CHECK_INTERVAL_MS = 5_000;      // how often we evaluate idle time
const WARN_BEFORE_MS = 60_000;        // show the "still there?" warning in the last 60s
const WRITE_THROTTLE_MS = 2_000;      // don't hammer localStorage on every mousemove

export function IdleLogout({ authed }: { authed: boolean }) {
  const [warnOpen, setWarnOpen] = useState(false);
  const [remaining, setRemaining] = useState(WARN_BEFORE_MS / 1000);
  const lastWriteRef = useRef(0);
  // Mirror of warnOpen the (stable) activity listener reads without re-binding.
  const warnOpenRef = useRef(false);
  useEffect(() => { warnOpenRef.current = warnOpen; }, [warnOpen]);

  const timeoutMs = Math.max(1, IDLE_TIMEOUT_MINUTES) * 60_000;

  const readLast = () => Number(window.localStorage.getItem(LAST_ACTIVITY_KEY)) || Date.now();
  const markActive = useCallback(() => {
    const now = Date.now();
    if (now - lastWriteRef.current < WRITE_THROTTLE_MS) return;   // throttle writes
    lastWriteRef.current = now;
    window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
  }, []);

  const signOutNow = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clearLocalChat();
    window.location.href = '/home?auth=open&mode=login';
  }, []);

  const stayActive = useCallback(() => {
    lastWriteRef.current = 0;      // force the write through the throttle
    markActive();
    setWarnOpen(false);
  }, [markActive]);

  useEffect(() => {
    if (!FEATURES.idleLogout || !authed) return;

    // Seed the clock, but only if there isn't already a fresher timestamp from another tab.
    if (Date.now() - readLast() > timeoutMs) markActive();
    else if (!window.localStorage.getItem(LAST_ACTIVITY_KEY)) markActive();

    // Passive activity keeps the session alive (but never while the warning is up - there the
    // user must explicitly choose, so a stray mousemove can't silently cancel the logout).
    const onActivity = () => { if (!warnOpenRef.current) markActive(); };
    for (const e of ACTIVITY_EVENTS) window.addEventListener(e, onActivity, { passive: true });

    // Refocusing a tab is NOT activity - it's the moment to re-check whether we've gone idle.
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);

    // If another tab records activity, reflect it here (e.g. dismiss our warning).
    const onStorage = (ev: StorageEvent) => { if (ev.key === LAST_ACTIVITY_KEY) check(); };
    window.addEventListener('storage', onStorage);

    function check() {
      const idle = Date.now() - readLast();
      if (idle >= timeoutMs) { void signOutNow(); return; }
      if (idle >= timeoutMs - WARN_BEFORE_MS) {
        setRemaining(Math.max(1, Math.ceil((timeoutMs - idle) / 1000)));
        setWarnOpen(true);
      } else {
        setWarnOpen(false);
      }
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      for (const e of ACTIVITY_EVENTS) window.removeEventListener(e, onActivity);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, timeoutMs, markActive, signOutNow]);

  // Tighten the countdown display to ~1s while the warning is visible.
  useEffect(() => {
    if (!warnOpen) return;
    const id = setInterval(() => {
      const idle = Date.now() - readLast();
      const left = Math.ceil((timeoutMs - idle) / 1000);
      if (left <= 0) { void signOutNow(); return; }
      setRemaining(left);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warnOpen, timeoutMs, signOutNow]);

  if (!warnOpen) return null;

  const mm = Math.floor(remaining / 60);
  const ss = String(remaining % 60).padStart(2, '0');

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-brand-900/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-3xl bg-card shadow-2xl border border-[--color-border] p-7 text-center animate-fade-up">
        <h2 className="text-lg font-semibold text-brand-900">Still there?</h2>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          You&apos;ve been inactive for a while. For your security we&apos;ll sign you out in{' '}
          <span className="font-semibold text-brand-900 tabular-nums">{mm > 0 ? `${mm}:${ss}` : `${ss}s`}</span>.
        </p>
        <div className="mt-6 flex flex-col gap-2.5">
          <Button variant="accent" onClick={stayActive}>Stay signed in</Button>
          <Button variant="ghost" onClick={() => void signOutNow()}>Log out now</Button>
        </div>
      </div>
    </div>
  );
}
