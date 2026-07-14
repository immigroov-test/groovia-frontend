'use client';
import { useState } from 'react';
import { motion } from 'motion/react';

// News-ticker: each line enters from the right, runs across, and exits to the left; then
// the next line follows. Continuous right-to-left motion, like a TV news bar.
export function CyclingText({
  lines,
  active,
  duration = 11,
  className = '',
}: {
  lines: readonly string[];
  active: boolean;
  duration?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {active && lines.length > 0 && (
        <motion.p
          key={i}
          initial={{ x: '100%' }}
          animate={{ x: '-100%' }}
          transition={{ duration, ease: 'linear' }}
          onAnimationComplete={() => setI((n) => (n + 1) % lines.length)}
          className="absolute inset-0 flex items-center justify-center whitespace-nowrap text-sm sm:text-base text-foreground/70"
        >
          {lines[i]}
        </motion.p>
      )}
    </div>
  );
}
