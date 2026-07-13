'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

// Shows one line at a time: it fades/slides in, holds, slides out, and the next takes its
// place. No box. Cycles while `active`.
export function CyclingText({
  lines,
  active,
  interval = 2800,
  className = '',
}: {
  lines: readonly string[];
  active: boolean;
  interval?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active || lines.length <= 1) return;
    const id = setInterval(() => setI((n) => (n + 1) % lines.length), interval);
    return () => clearInterval(id);
  }, [active, lines.length, interval]);

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center text-base sm:text-lg text-foreground/70 px-4"
        >
          {lines[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
