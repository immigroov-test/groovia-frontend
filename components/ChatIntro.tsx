'use client';
import { forwardRef } from 'react';
import { motion } from 'motion/react';
import { Compass, Users, Zap } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';
import { TypeText } from './TypeText';
import { AiAvatar } from './AiAvatar';

const FEATURE_ICONS = [Compass, Users, Zap];
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
        <motion.h1
          {...rise(seen, 0)}
          className="text-4xl sm:text-6xl font-bold tracking-tight min-h-[1.2em] bg-gradient-to-r from-brand-900 to-accent-500 bg-clip-text text-transparent"
        >
          <TypeText text={hero.title} active={seen} speed={70} />
        </motion.h1>

        <motion.p {...rise(seen, 1.2)} className="mt-3 text-lg sm:text-xl font-semibold text-brand-700">
          {hero.tagline}
        </motion.p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl w-full">
          {hero.features.map((text, i) => {
            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
            return (
              <motion.div key={text} {...rise(seen, 1.5 + i * 0.18)}>
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

        {/* Groovia's initial message, directly after the boxes (no gap). Clear bubble +
            avatar so it reads as a message from the AI. */}
        <motion.div {...rise(seen, 2.3)} className="mt-6 w-full max-w-3xl flex items-start gap-2.5 justify-start">
          <AiAvatar />
          <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-[--color-border] shadow-sm px-4 py-3 text-sm leading-relaxed text-foreground text-left">
            {UI_CONTENT.welcomeMessage}
          </div>
        </motion.div>
      </div>
    </section>
  );
});
