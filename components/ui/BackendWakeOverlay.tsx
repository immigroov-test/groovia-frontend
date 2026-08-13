'use client';
import { useEffect, useState } from 'react';
import { Server } from 'lucide-react';
import { COLD_START_SECONDS, subscribeWake } from '@/lib/backendWake';
import { CountdownTimer } from './CountdownTimer';

// Mounted once, in the root layout. Every client call goes through apiFetch, so this covers the whole
// app and no page needs its own copy.
//
// It only appears when a request has already been slow for WAKE_THRESHOLD_MS, so a warm backend never
// shows it. The point is to replace "the button did nothing" with a reason and a number, because a
// user who is told nothing presses the button again.
export function BackendWakeOverlay() {
  const [waking, setWaking] = useState(false);
  const [overrun, setOverrun] = useState(false);

  useEffect(() => subscribeWake((w) => {
    setWaking(w);
    if (w) setOverrun(false);      // fresh wait, fresh countdown
  }), []);

  if (!waking) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
         role="alertdialog" aria-live="polite" aria-label="Server is starting up">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center">
          <Server className="h-6 w-6 text-brand-600" />
        </div>

        <h3 className="mt-4 text-lg font-semibold text-brand-900">Starting the server</h3>
        <p className="mt-2 text-sm text-muted leading-relaxed">
          {overrun
            ? 'This is taking longer than usual. Please keep this tab open, it will continue on its own.'
            : 'Our server goes to sleep when it has been quiet for a while, and it is waking up now. This happens on the first request only.'}
        </p>

        <div className="mt-5 flex justify-center">
          <CountdownTimer
            seconds={COLD_START_SECONDS}
            onDone={() => setOverrun(true)}
            label={overrun ? 'still working' : 'usually ready within'}
          />
        </div>

        <p className="mt-4 text-xs text-muted">
          Nothing was lost. Your request runs as soon as the server is up.
        </p>
      </div>
    </div>
  );
}
