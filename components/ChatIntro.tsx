'use client';
import { forwardRef, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Compass, Users, Zap } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';

const FEATURE_ICONS = [Compass, Users, Zap];

// Headline types itself out; caret hides when done.
function TypeText({ text, speed = 45, className }: { text: string; speed?: number; className?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
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
  }, [text, speed]);

  const done = shown >= text.length;
  return (
    <span className={className}>
      {text.slice(0, shown)}
      {!done && <span className="text-accent-500 animate-pulse">▍</span>}
    </span>
  );
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
});

// Section 2 of the landing: Groovia introduces itself and its advantages. Scroll cues
// and section detection are handled by the parent (ChatInterface).
export const ChatIntro = forwardRef<HTMLElement>(function ChatIntro(_props, ref) {
  const hero = UI_CONTENT.hero;

  return (
    <section ref={ref} className="relative min-h-full overflow-hidden flex flex-col">
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-12">
        <motion.h1
          {...fadeUp(0)}
          className="text-4xl sm:text-6xl font-bold tracking-tight min-h-[1.2em] bg-gradient-to-r from-brand-900 to-accent-500 bg-clip-text text-transparent"
        >
          <TypeText text={hero.title} />
        </motion.h1>

        <motion.p {...fadeUp(0.75)} className="mt-3 text-lg sm:text-xl font-semibold text-brand-700">
          {hero.tagline}
        </motion.p>

        <motion.p {...fadeUp(1.1)} className="mt-7 max-w-2xl text-sm sm:text-base font-semibold text-brand-800">
          {hero.movement}
        </motion.p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl w-full">
          {hero.features.map((text, i) => {
            const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length];
            return (
              <motion.div key={text} {...fadeUp(1.25 + i * 0.12)}>
                {/* Gradient-border glass card */}
                <div className="group h-full rounded-2xl p-[1px] bg-gradient-to-br from-brand-200/80 via-transparent to-accent-200/80 hover:from-brand-300 hover:to-accent-300 transition-colors">
                  <div className="h-full rounded-2xl bg-card/80 backdrop-blur-md px-4 py-4 flex items-start gap-3 text-left transition-transform duration-200 group-hover:-translate-y-0.5">
                    <span className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-brand-700 to-accent-500 text-white flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(245,158,11,0.5)]">
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
