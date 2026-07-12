'use client';
import { forwardRef, type RefObject } from 'react';
import { motion } from 'motion/react';
import { Users, ShieldCheck, Globe } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';

const CARD_ICONS = [Users, ShieldCheck, Globe];
const EASE = [0.22, 1, 0.36, 1] as const;

interface Props {
  // The scroll container the section lives in, so the entrance transitions observe the
  // right root and replay each time the section scrolls into view.
  scrollParent: RefObject<HTMLDivElement | null>;
}

// Section 1 of the landing: what Immigroov is, headline in the Immigroov blue-to-orange
// gradient, three carded points (icon on top). Groovia is revealed on scroll.
export const ImmigroovIntro = forwardRef<HTMLElement, Props>(function ImmigroovIntro({ scrollParent }, ref) {
  const b = UI_CONTENT.brandIntro;
  const viewport = { root: scrollParent, amount: 0.3, once: false } as const;
  const rise = { initial: { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 } };

  return (
    <section ref={ref} className="relative min-h-full overflow-hidden flex flex-col snap-start">
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-12">
        <motion.h1
          {...rise}
          viewport={viewport}
          transition={{ duration: 0.5, ease: EASE }}
          className="max-w-4xl text-4xl sm:text-6xl font-bold tracking-tight leading-[1.12] bg-gradient-to-r from-blue-700 via-blue-500 to-accent-500 bg-clip-text text-transparent"
        >
          {b.headline}
        </motion.h1>

        <div className="mt-9 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-4xl w-full">
          {b.cards.map((text, i) => {
            const Icon = CARD_ICONS[i % CARD_ICONS.length];
            return (
              <motion.div
                key={text}
                {...rise}
                viewport={viewport}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12, ease: EASE }}
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
