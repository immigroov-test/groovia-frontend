'use client';
import { forwardRef, useEffect, useState, type RefObject } from 'react';
import { motion } from 'motion/react';
import { Compass, Users, Zap } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';

const FEATURE_ICONS = [Compass, Users, Zap];
const EASE = [0.22, 1, 0.36, 1] as const;

// Headline types itself out while `active` (the section is in view); resets when it
// leaves so it re-types the next time the user scrolls back to it.
function TypeText({ text, speed = 45, active, className }: { text: string; speed?: number; active: boolean; className?: string }) {
  const [shown, setShown] = useState(0);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!active) {
      setShown(0);
      return;
    }
    setShown(0);
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
  }, [text, speed, active]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const done = shown >= text.length;
  return (
    <span className={className}>
      {text.slice(0, shown)}
      {!done && active && <span className="text-accent-500 animate-pulse">▍</span>}
    </span>
  );
}

interface Props {
  scrollParent?: RefObject<HTMLDivElement | null>;
}

// Section 2 of the landing: Groovia introduces itself and its advantages.
export const ChatIntro = forwardRef<HTMLElement, Props>(function ChatIntro({ scrollParent }, ref) {
  const hero = UI_CONTENT.hero;
  const [typing, setTyping] = useState(false);
  const viewport = { root: scrollParent, amount: 0.4, once: false } as const;
  const rise = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 } };

  return (
    <section ref={ref} className="relative min-h-full overflow-hidden flex flex-col snap-start">
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-12">
        <motion.h1
          {...rise}
          viewport={viewport}
          onViewportEnter={() => setTyping(true)}
          onViewportLeave={() => setTyping(false)}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-4xl sm:text-6xl font-bold tracking-tight min-h-[1.2em] bg-gradient-to-r from-brand-900 to-accent-500 bg-clip-text text-transparent"
        >
          <TypeText text={hero.title} active={typing} />
        </motion.h1>

        <motion.p
          {...rise}
          viewport={viewport}
          transition={{ duration: 0.5, delay: 0.5, ease: EASE }}
          className="mt-3 text-lg sm:text-xl font-semibold text-brand-700"
        >
          {hero.tagline}
        </motion.p>

        <div className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl w-full">
          {hero.features.map((text, i) => {
            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
            return (
              <motion.div
                key={text}
                {...rise}
                viewport={viewport}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.12, ease: EASE }}
              >
                {/* Gradient-border glass card, icon centered on top (issue #3) */}
                <div className="group h-full rounded-2xl p-[1px] bg-gradient-to-br from-brand-200/80 via-transparent to-accent-200/80 hover:from-brand-300 hover:to-accent-300 transition-colors">
                  <div className="h-full rounded-2xl bg-card/80 backdrop-blur-md px-4 py-5 flex flex-col items-center text-center gap-2.5 transition-transform duration-200 group-hover:-translate-y-0.5">
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
