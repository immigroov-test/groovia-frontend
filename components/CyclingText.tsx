'use client';
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { TypeText } from './TypeText';

const EASE = [0.22, 1, 0.36, 1] as const;

// One line at a time, typewriter style: the line types itself in, holds so it's readable,
// then shrinks away, and the next line types in. Loops.
export function CyclingText({
  lines,
  active,
  hold = 1400,
  speed = 42,
  className = '',
}: {
  lines: readonly string[];
  active: boolean;
  hold?: number;
  speed?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // After a line finishes typing, hold, then advance - the key change makes the current
  // line shrink out and the next type in.
  const onTyped = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setI((n) => (n + 1) % lines.length), hold);
  };

  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        {active && lines.length > 0 && (
          <motion.p
            key={i}
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-sm sm:text-base text-foreground/70"
          >
            <TypeText key={i} text={lines[i]} active={active} speed={speed} onDone={onTyped} />
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
