'use client';
import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { UI_CONTENT } from '../lib/content';
import { TypeText } from './TypeText';
import { CyclingText } from './CyclingText';

const EASE = [0.22, 1, 0.36, 1] as const;

// Entry animation gated on `seen` (latched true on first view): plays once, then the
// content stays put so scrolling back never shows a blank.
const rise = (seen: boolean, delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: seen ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
  transition: { duration: 0.75, delay, ease: EASE },
});

interface Props {
  seen: boolean;
}

export const ChatIntro = forwardRef<HTMLElement, Props>(function ChatIntro({ seen }, ref) {
  const hero = UI_CONTENT.hero;

  return (
    <section ref={ref} className="relative min-h-full flex flex-col snap-start">
      <div className="relative z-10 my-auto w-full flex flex-col items-center text-center px-5 sm:px-8 py-10">
        {/* Title sized to match the Section 1 (peer-to-peer) headline. */}
        <motion.h1
          {...rise(seen, 0)}
          className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight min-h-[1.4em] bg-gradient-to-r from-brand-900 to-accent-500 bg-clip-text text-transparent"
        >
          <TypeText text={hero.title} active={seen} speed={70} />
        </motion.h1>

        {/* The old three feature boxes, now floating lines that cycle one at a time. */}
        <motion.div {...rise(seen, 0.8)} className="mt-5 w-full">
          <CyclingText lines={hero.features} active={seen} className="h-8 sm:h-9" />
        </motion.div>
      </div>
    </section>
  );
});
