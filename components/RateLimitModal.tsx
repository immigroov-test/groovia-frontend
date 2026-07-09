'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { shuffledRiddles } from '../lib/riddles';

// Above this many seconds the wait is a per-day reset (hours) - show a "come back at"
// time instead of a live ring + riddles (nobody watches a ring for hours).
const LONG_THRESHOLD_SEC = 5 * 60;

// Shown when Groq's rate limit is hit. `until` is the epoch-ms the block lifts (persisted
// by the parent, so it survives navigation/refresh). Closable - closing only hides this
// popup; the chat stays disabled until `until` regardless. The parent unmounts us at zero.
export function RateLimitModal({ until, onClose }: { until: number; onClose: () => void }) {
  const totalRef = useRef(Math.max(1, Math.ceil((until - Date.now()) / 1000)));
  const [remaining, setRemaining] = useState(totalRef.current);

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, Math.ceil((until - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [until]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isLong = totalRef.current > LONG_THRESHOLD_SEC;
  const clock = `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;
  const backAt = new Date(until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-brand-900/50 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative w-[92vw] max-w-2xl bg-card rounded-3xl shadow-2xl overflow-hidden flex flex-col sm:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button" onClick={onClose} aria-label="Close"
            className="absolute top-3 right-3 z-30 p-1.5 rounded-full text-brand-500 hover:text-brand-900 hover:bg-brand-50 sm:text-white/80 sm:hover:text-white sm:hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Left - the timer */}
          <div className="sm:w-1/2 px-6 py-10 flex flex-col items-center justify-center text-center gap-3 min-h-[260px]">
            {isLong ? (
              <>
                <h2 className="text-lg font-semibold text-[#102a4c]">You&apos;ve reached today&apos;s limit</h2>
                <p className="text-sm text-muted">Groovia is at capacity for now. You can chat again after</p>
                <p className="text-4xl font-bold text-[#102a4c] tabular-nums mt-1">{backAt}</p>
                <p className="text-xs text-muted mt-1">Feel free to keep browsing in the meantime.</p>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold text-[#102a4c]">Just a quick breather</h2>
                <Ring remaining={remaining} total={totalRef.current} label={clock} />
                <p className="text-sm text-muted">You can chat again the moment this runs out.</p>
              </>
            )}
          </div>

          {/* Right - riddle over the same navy hero as the login popup */}
          <div className="relative sm:w-1/2 px-6 py-10 text-white bg-[#102a4c] overflow-hidden flex flex-col justify-center min-h-[260px]">
            <Image src="/login-bg.jpg" alt="" fill className="object-cover object-center" sizes="(max-width: 640px) 92vw, 320px" />
            <div className="absolute inset-0 bg-[#0a1e3a]/80" />
            <div className="relative">
              {isLong ? (
                <p className="text-base leading-relaxed text-white/90">
                  Grab a coffee - we&apos;ll be ready when you get back. Meanwhile, you can explore mentors and your saved sessions.
                </p>
              ) : (
                <RiddlePanel />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Ring({ remaining, total, label }: { remaining: number; total: number; label: string }) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const frac = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  return (
    <div className="relative h-32 w-32">
      <svg className="h-32 w-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#e2e8f0" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={R} fill="none" stroke="#102a4c" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-[#102a4c] tabular-nums">
        {label}
      </div>
    </div>
  );
}

function RiddlePanel() {
  const riddles = useMemo(() => shuffledRiddles(), []);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);

  // 10s to think, then reveal, then 3s on the answer, then the next riddle - looping.
  useEffect(() => {
    if (riddles.length === 0) return;
    const delay = revealed ? 3000 : 10000;
    const t = setTimeout(() => {
      if (revealed) { setRevealed(false); setIdx((i) => (i + 1) % riddles.length); }
      else setRevealed(true);
    }, delay);
    return () => clearTimeout(t);
  }, [revealed, idx, riddles.length]);

  const riddle = riddles[idx] ?? { question: '', answer: '' };
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">While you wait, a riddle</p>
      <p className="text-base font-medium leading-snug min-h-[3.5rem]">{riddle.question}</p>
      {revealed ? (
        <p className="text-sm text-emerald-300"><span className="text-white/60">Answer: </span>{riddle.answer}</p>
      ) : (
        <TenSecondBar activeKey={idx} />
      )}
    </div>
  );
}

function TenSecondBar({ activeKey }: { activeKey: number }) {
  const [w, setW] = useState(100);
  useEffect(() => {
    setW(100);
    // Two frames so the browser paints 100% before transitioning to 0 over 10s.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setW(0)));
    return () => cancelAnimationFrame(id);
  }, [activeKey]);
  return (
    <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
      <div className="h-full bg-accent-500 rounded-full" style={{ width: `${w}%`, transition: 'width 10s linear' }} />
    </div>
  );
}
