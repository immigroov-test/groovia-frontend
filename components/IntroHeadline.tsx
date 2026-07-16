'use client';
import { useEffect, useRef, useState } from 'react';

// Types out "<prefix><main>" once `active` latches, holds it, then un-types just the
// `prefix` from the front (character by character, same typewriter feel) so only
// "<main>" is left. Example: types "Immigroov is a Peer-to-Peer ... Platform", then
// deletes "Immigroov is a " leaving "Peer-to-Peer ... Platform". Plays once.
// `onDone` fires when the prefix has fully disappeared.
type Phase = 'idle' | 'typing' | 'holding' | 'deleting' | 'done';

export function IntroHeadline({
  prefix,
  main,
  active,
  speed = 34,
  delSpeed = 24,
  hold = 900,
  className,
  onDone,
}: {
  prefix: string;
  main: string;
  active: boolean;
  speed?: number;
  delSpeed?: number;
  hold?: number;
  className?: string;
  onDone?: () => void;
}) {
  const full = prefix + main;
  const [typed, setTyped] = useState(0);   // chars shown from the start of `full` (typing)
  const [cut, setCut] = useState(0);       // chars removed from the front (deleting)
  const [phase, setPhase] = useState<Phase>('idle');
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => { if (active && phase === 'idle') setPhase('typing'); }, [active, phase]);

  useEffect(() => {
    if (phase !== 'typing') return;
    if (typed >= full.length) { setPhase('holding'); return; }
    const id = setTimeout(() => setTyped((n) => n + 1), speed);
    return () => clearTimeout(id);
  }, [phase, typed, full.length, speed]);

  useEffect(() => {
    if (phase !== 'holding') return;
    const id = setTimeout(() => setPhase('deleting'), hold);
    return () => clearTimeout(id);
  }, [phase, hold]);

  useEffect(() => {
    if (phase !== 'deleting') return;
    if (cut >= prefix.length) { setPhase('done'); onDoneRef.current?.(); return; }
    const id = setTimeout(() => setCut((n) => n + 1), delSpeed);
    return () => clearTimeout(id);
  }, [phase, cut, prefix.length, delSpeed]);

  const text =
    phase === 'idle' || phase === 'typing' ? full.slice(0, typed)
    : phase === 'holding' ? full
    : full.slice(cut);   // deleting / done: eat the prefix from the front

  const typingCursor = phase === 'typing';
  const deletingCursor = phase === 'deleting';

  return (
    <span className={className}>
      {deletingCursor && <span className="text-accent-500 animate-pulse">▍</span>}
      {text}
      {typingCursor && <span className="text-accent-500 animate-pulse">▍</span>}
    </span>
  );
}
