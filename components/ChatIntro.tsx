'use client';
import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';
import { TypeText } from './TypeText';
import { CyclingText } from './CyclingText';
import { AiAvatar } from './AiAvatar';

const EASE = [0.22, 1, 0.36, 1] as const;

// Entry animation gated on `seen` (latched true on first view): plays once, then holds.
const rise = (seen: boolean, delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: seen ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
  transition: { duration: 0.75, delay, ease: EASE },
});

interface Props {
  seen: boolean;
  showArrows?: boolean;
  showWelcome?: boolean;
  onReveal?: () => void;
}

export const ChatIntro = forwardRef<HTMLElement, Props>(function ChatIntro(
  { seen, showArrows = false, showWelcome = false, onReveal },
  ref,
) {
  const hero = UI_CONTENT.hero;

  return (
    // A chat screen: the title + ticker sit at the top (right under Section 1's boxes, no
    // void), and the first message / arrows sit at the bottom, just above the composer.
    <section ref={ref} className="relative min-h-full flex flex-col snap-start px-5 sm:px-8 py-8">
      <div className="relative z-10 pt-2 sm:pt-6 w-full flex flex-col items-center text-center">
        <motion.h1
          {...rise(seen, 0)}
          className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight min-h-[1.4em] bg-gradient-to-r from-brand-900 to-accent-500 bg-clip-text text-transparent"
        >
          <TypeText text={hero.title} active={seen} speed={70} />
        </motion.h1>
        {/* The old three feature boxes, now floating lines that run right-to-left. */}
        <motion.div {...rise(seen, 0.8)} className="mt-5 w-full">
          <CyclingText lines={hero.features} active={seen} className="h-8 sm:h-9" />
        </motion.div>
      </div>

      {/* Bottom of the screen: the arrows (before reveal) and then the first message, in place
          so there's no distant scroll and no gap. */}
      <div className="relative z-10 mt-auto pb-1 w-full max-w-3xl mx-auto min-h-[4.5rem]">
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="flex items-start gap-2.5 justify-start"
          >
            <AiAvatar />
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-[--color-border] shadow-sm px-4 py-3 text-sm leading-relaxed text-foreground text-left composer-glow">
              {UI_CONTENT.welcomeMessage}
            </div>
          </motion.div>
        )}
        {showArrows && (
          <button
            type="button"
            onClick={onReveal}
            aria-label="Reveal the first message"
            className="mx-auto flex flex-col items-center -space-y-2.5 text-brand-700 animate-fade-up"
          >
            {[0, 1, 2].map((i) => (
              <ChevronDown key={i} className="h-6 w-6 animate-arrow-cascade" style={{ animationDelay: `${i * 0.25}s` }} />
            ))}
          </button>
        )}
      </div>
    </section>
  );
});
