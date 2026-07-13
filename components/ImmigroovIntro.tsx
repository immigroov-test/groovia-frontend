'use client';
import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { Users, ShieldCheck, Globe } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';
import { TypeText } from './TypeText';

const CARD_ICONS = [Users, ShieldCheck, Globe];
const EASE = [0.22, 1, 0.36, 1] as const;
const TYPE_SPEED = 28;

// Entry animation gated on `seen` (latched true on first view), so it plays once and the
// content then stays put - no fade-out / blank pages when scrolling back.
const rise = (seen: boolean, delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: seen ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
  transition: { duration: 0.5, delay, ease: EASE },
});

interface Props {
  seen: boolean;
}

export const ImmigroovIntro = forwardRef<HTMLElement, Props>(function ImmigroovIntro({ seen }, ref) {
  const b = UI_CONTENT.brandIntro;
  // Boxes drop in only after the headline has finished typing.
  const boxStart = (b.headline.length * TYPE_SPEED) / 1000 + 0.25;

  return (
    <section ref={ref} className="relative min-h-full overflow-hidden flex flex-col snap-start">
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-12">
        {/* min-h reserves the headline space so typing doesn't shift layout. Gradient is
            the exact Immigroov logo colours (blue #00377d -> orange #fe9d1c). */}
        <motion.h1
          {...rise(seen, 0)}
          className="max-w-4xl min-h-[6rem] sm:min-h-[7rem] text-2xl sm:text-4xl font-bold tracking-tight leading-[1.12] bg-gradient-to-r from-[#00377d] via-[#0a4fa0] to-[#fe9d1c] bg-clip-text text-transparent"
        >
          <TypeText text={b.headline} active={seen} speed={TYPE_SPEED} />
        </motion.h1>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl w-full">
          {b.cards.map((text, i) => {
            const Icon = CARD_ICONS[i % CARD_ICONS.length];
            return (
              <motion.div key={text} {...rise(seen, boxStart + i * 0.14)}>
                {/* Icon left-of-text on mobile (compact), centered on top on desktop */}
                <div className="group h-full rounded-2xl p-[1px] bg-gradient-to-br from-brand-200/80 via-transparent to-accent-200/80 hover:from-brand-300 hover:to-accent-300 transition-colors">
                  <div className="h-full rounded-2xl bg-card/80 backdrop-blur-md px-4 py-4 sm:py-5 flex flex-row sm:flex-col items-center text-left sm:text-center gap-3 sm:gap-2.5 transition-transform duration-200 group-hover:-translate-y-0.5">
                    <span className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-brand-700 to-accent-500 text-white flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(245,158,11,0.5)]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="text-sm leading-relaxed text-foreground/75">{text}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
});
