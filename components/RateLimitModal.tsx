'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { shuffledRiddles } from '../lib/riddles';

// Above this many seconds the wait is a per-day reset (hours) - show a "come back at"
// time instead of a live ring + riddles (nobody watches a ring for hours).
const LONG_THRESHOLD_SEC = 5 * 60;
const WRONG_WAIT_SEC = 10;

const ENCOURAGEMENTS = ['Nice - spot on!', 'You got it!', 'Sharp thinking!', 'Exactly right!', 'Correct, nicely done!'];

// Lenient answer check: case-insensitive, ignore punctuation and leading a/an/the, and
// accept the key noun of a multi-word answer (e.g. "sponge" for "A sponge.").
function normalizeAns(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\b(a|an|the)\b/g, ' ').replace(/\s+/g, ' ').trim();
}
function isCorrect(guess: string, answer: string): boolean {
  const g = normalizeAns(guess), a = normalizeAns(answer);
  if (!g) return false;
  return g === a || (g.length >= 3 && a.includes(g)) || (a.length >= 3 && g.includes(a));
}

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

          {/* Left - the timer, over the same skyline background as the login popup */}
          <div className="relative sm:w-1/2 min-h-[300px] overflow-hidden">
            <Image src="/login_left_bg.png" alt="" fill className="object-cover object-bottom" sizes="(max-width: 640px) 92vw, 320px" />
            <div className="absolute inset-0 bg-white/65" />
            <div className="relative z-10 h-full px-6 py-10 flex flex-col items-center justify-center text-center gap-3">
              {isLong ? (
                <>
                  <h2 className="text-lg font-semibold text-[#102a4c]">You&apos;ve reached today&apos;s limit</h2>
                  <p className="text-sm text-[#102a4c]/70">Groovia&apos;s daily message limit is used up for now. You can chat again after</p>
                  <p className="text-4xl font-bold text-[#102a4c] tabular-nums mt-1">{backAt}</p>
                  <p className="text-xs text-[#102a4c]/70 mt-1">Feel free to keep browsing in the meantime.</p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-[#102a4c]">Just a quick breather</h2>
                  <p className="text-sm text-[#102a4c]/70">Groovia has hit its message limit for the moment. Hang tight for:</p>
                  <Ring remaining={remaining} total={totalRef.current} label={clock} />
                  <p className="text-xs text-[#102a4c]/70">You can chat again as soon as it runs out.</p>
                </>
              )}
            </div>
          </div>

          {/* Right - interactive riddle over the navy hero */}
          <div className="relative sm:w-1/2 px-6 py-9 text-white bg-[#102a4c] overflow-hidden flex flex-col justify-center min-h-[300px]">
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
    <div className="relative h-36 w-36">
      <svg className="h-36 w-36 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#dbe3ee" strokeWidth="8" />
        <circle
          cx="60" cy="60" r={R} fill="none" stroke="#102a4c" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-xl font-bold leading-none text-[#102a4c] tabular-nums">
        {label}
      </div>
    </div>
  );
}

type Phase = 'guessing' | 'correct' | 'wrong' | 'revealed';

function RiddlePanel() {
  const riddles = useMemo(() => shuffledRiddles(), []);
  const [idx, setIdx] = useState(0);
  const [guess, setGuess] = useState('');
  const [phase, setPhase] = useState<Phase>('guessing');
  const [encourage] = useState(() => ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
  const [wrongWait, setWrongWait] = useState(0);

  const riddle = riddles[idx] ?? { question: '', answer: '' };

  // A wrong guess costs a 10s pause before "New riddle" unlocks (keeps the pacing gentle).
  useEffect(() => {
    if (phase !== 'wrong') { setWrongWait(0); return; }
    setWrongWait(WRONG_WAIT_SEC);
    const id = setInterval(() => setWrongWait((w) => (w <= 1 ? 0 : w - 1)), 1000);
    return () => clearInterval(id);
  }, [phase, idx]);

  function submit() {
    if (phase !== 'guessing' || !guess.trim()) return;
    setPhase(isCorrect(guess, riddle.answer) ? 'correct' : 'wrong');
  }
  function next() {
    setIdx((i) => (i + 1) % riddles.length);
    setGuess('');
    setPhase('guessing');
  }

  const answered = phase !== 'guessing';
  const nextLocked = phase === 'wrong' && wrongWait > 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/60">While you wait, a riddle</p>
      <p className="text-base font-medium leading-snug min-h-[3rem]">{riddle.question}</p>

      {!answered && (
        <>
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit(); }}
            placeholder="Type your answer…"
            className="w-full px-3 h-10 rounded-lg bg-white/95 text-sm text-brand-900 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-500"
          />
          <div className="flex items-center gap-3">
            <button
              type="button" onClick={submit} disabled={!guess.trim()}
              className="px-4 h-9 rounded-full bg-accent-500 text-white text-sm font-medium hover:bg-accent-600 disabled:opacity-40"
            >
              Submit
            </button>
            <button type="button" onClick={() => setPhase('revealed')} className="text-xs text-white/60 hover:text-white/90 underline">
              Show answer
            </button>
          </div>
        </>
      )}

      {phase === 'correct' && (
        <p className="text-sm text-emerald-300 font-medium">
          {encourage} It&apos;s <span className="font-semibold">{riddle.answer}</span>
        </p>
      )}
      {(phase === 'wrong' || phase === 'revealed') && (
        <p className="text-sm text-white/90">
          {phase === 'wrong' ? 'Not quite - the answer is ' : 'The answer is '}
          <span className="font-semibold text-emerald-300">{riddle.answer}</span>
        </p>
      )}

      {answered && (
        <button
          type="button" onClick={next} disabled={nextLocked}
          className="self-start px-4 h-9 rounded-full bg-white/15 text-white text-sm font-medium hover:bg-white/25 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {nextLocked ? `New riddle in ${wrongWait}s` : 'New riddle →'}
        </button>
      )}
    </div>
  );
}
