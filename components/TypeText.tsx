'use client';
import { useEffect, useRef, useState } from 'react';

// Types out `text` one character at a time once `active` becomes true, then holds fully
// typed (no reset). Meant to be driven by a latched "seen" flag so it plays exactly once.
// `onDone` fires once, when the last character has been typed.
export function TypeText({
  text,
  speed = 50,
  active,
  className,
  onDone,
}: {
  text: string;
  speed?: number;
  active: boolean;
  className?: string;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      setShown((n) => {
        if (n >= text.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, speed);
    return () => clearInterval(id);
  }, [active, text, speed]);

  const done = shown >= text.length;

  // Fire onDone exactly once when typing completes.
  const doneFiredRef = useRef(false);
  useEffect(() => { doneFiredRef.current = false; }, [text]);
  useEffect(() => {
    if (active && done && text.length > 0 && !doneFiredRef.current) {
      doneFiredRef.current = true;
      onDone?.();
    }
  }, [active, done, text, onDone]);
  return (
    <span className={className}>
      {text.slice(0, shown)}
      {!done && active && <span className="text-accent-500 animate-pulse">▍</span>}
    </span>
  );
}
