'use client';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1] as const;

// One line at a time, running right-to-left: it slides in from the right, holds centered so
// it's readable, then slides out to the left and the next follows. Visible immediately (no
// long off-screen run-up).
export function CyclingText({
  lines,
  active,
  interval = 3200,
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
    <div className={`relative w-full overflow-hidden ${className}`}>
      <AnimatePresence mode="wait">
        {active && (
          <motion.p
            key={i}
            initial={{ x: '55%', opacity: 0 }}
            animate={{ x: '0%', opacity: 1 }}
            exit={{ x: '-55%', opacity: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
            className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-sm sm:text-base text-foreground/70"
          >
            {lines[i]}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
