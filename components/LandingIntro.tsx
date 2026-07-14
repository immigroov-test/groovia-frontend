'use client';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Globe, Sparkles, ChevronDown } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';
import { TypeText } from './TypeText';
import { CyclingText } from './CyclingText';
import { AiAvatar } from './AiAvatar';

const EASE = [0.22, 1, 0.36, 1] as const;
const CARD_ICONS = [Users, Globe, Sparkles];
const HEAD_SPEED = 34;

// The whole landing as one tight, choreographed column (no full-height section voids):
//   1 headline fades in centered  ->  2 rises to the top  ->  3 boxes drop in  ->
//   4 "Chat with Groovia?" + running ticker  ->  5 down-arrows  ->  (tap) first message.
// Each beat is close to the last; on short screens the column scrolls itself to follow the
// newest beat, so it fits and flows on any screen size.
interface Props {
  hideGif: boolean;         // mobile: drop the globe after first scroll
  showWelcome: boolean;     // reveal the first message (driven by the parent)
  onReveal: () => void;     // user tapped the arrows
}

export const LandingIntro = forwardRef<HTMLDivElement, Props>(function LandingIntro(
  { hideGif, showWelcome, onReveal },
  ref,
) {
  const b = UI_CONTENT.brandIntro;
  const hero = UI_CONTENT.hero;

  // beat: 0 nothing, 1 headline centered, 2 headline at top, 3 boxes, 4 Groovia+ticker, 5 arrows.
  const [beat, setBeat] = useState(0);
  const grooviaRef = useRef<HTMLDivElement>(null);
  const arrowsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait out the one-time logo splash on a first visit so the headline doesn't start
    // underneath it.
    const splashPending = !window.localStorage.getItem('groovia.introSeen');
    const base = splashPending ? 2300 : 300;
    const at = (ms: number, fn: () => void) => window.setTimeout(fn, base + ms);
    const timers = [
      at(0, () => setBeat(1)),        // headline in, centered
      at(2600, () => setBeat(2)),     // headline rises to the top
      at(3300, () => setBeat(3)),     // boxes
      at(4600, () => setBeat(4)),     // Chat with Groovia? + ticker
      at(6000, () => setBeat(5)),     // arrows
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Follow the newest beat, but only if it's below the fold - so on a big screen where the
  // whole column already fits, nothing scrolls.
  useEffect(() => {
    const el = beat === 4 ? grooviaRef.current : beat === 5 ? arrowsRef.current : null;
    if (!el) return;
    if (el.getBoundingClientRect().bottom > window.innerHeight - 8) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [beat]);

  const rise = (on: boolean, delay = 0) => ({
    initial: { opacity: 0, y: 22 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { duration: 0.6, delay, ease: EASE },
  });

  return (
    <div ref={ref} className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-8 flex flex-col items-center text-center">
      {/* Beat 1-2: headline + globe fade in centered, then rise to the top. */}
      <motion.div
        initial={{ opacity: 0, y: '32svh' }}
        animate={{ opacity: beat >= 1 ? 1 : 0, y: beat >= 2 ? 0 : '32svh' }}
        transition={{ duration: 0.9, ease: EASE }}
        className="w-full pt-[8svh]"
      >
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-4 sm:gap-8">
          {!hideGif && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: beat >= 1 ? 1 : 0, scale: beat >= 1 ? 1 : 0.85 }}
              transition={{ duration: 0.8, ease: EASE }}
              className="mx-auto sm:mx-0 shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Globe_landingPage_GIF.gif" alt="" aria-hidden className="w-28 h-28 sm:w-44 sm:h-44 object-contain" />
            </motion.div>
          )}
          <h1 className="min-h-[3.5rem] sm:min-h-[6rem] text-2xl sm:text-4xl font-bold tracking-tight leading-[1.12] text-center sm:text-left bg-gradient-to-r from-[#00377d] via-[#0a4fa0] to-[#fe9d1c] bg-clip-text text-transparent">
            <TypeText text={b.headline} active={beat >= 1} speed={HEAD_SPEED} />
          </h1>
        </div>
      </motion.div>

      {/* Beat 3: the three boxes, right under the headline. */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
        {b.cards.map((text, i) => {
          const Icon = CARD_ICONS[i % CARD_ICONS.length];
          return (
            <motion.div key={text} {...rise(beat >= 3, 0.1 + i * 0.12)}>
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

      {/* Beat 4: Chat with Groovia? + the running ticker. */}
      <motion.div ref={grooviaRef} {...rise(beat >= 4)} className="mt-10 w-full flex flex-col items-center">
        <h2 className="text-2xl sm:text-4xl font-bold tracking-tight leading-tight bg-gradient-to-r from-brand-900 to-accent-500 bg-clip-text text-transparent">
          <TypeText text={hero.title} active={beat >= 4} speed={60} />
        </h2>
        <div className="mt-3 w-full">
          <CyclingText lines={hero.features} active={beat >= 4} className="h-8 sm:h-9" />
        </div>
      </motion.div>

      {/* Beat 5 -> tap: arrows, then the first message with its glow. */}
      <div ref={arrowsRef} className="mt-6 mb-8 w-full flex flex-col items-center min-h-[5rem]">
        {showWelcome ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="w-full max-w-2xl flex items-start gap-2.5 justify-start"
          >
            <AiAvatar />
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white border border-[--color-border] shadow-sm px-4 py-3 text-sm leading-relaxed text-foreground text-left composer-glow">
              {UI_CONTENT.welcomeMessage}
            </div>
          </motion.div>
        ) : (
          beat >= 5 && (
            <button
              type="button"
              onClick={onReveal}
              aria-label="Reveal the first message"
              className="flex flex-col items-center -space-y-2.5 text-brand-700 animate-fade-up"
            >
              {[0, 1, 2].map((i) => (
                <ChevronDown key={i} className="h-6 w-6 animate-arrow-cascade" style={{ animationDelay: `${i * 0.25}s` }} />
              ))}
            </button>
          )
        )}
      </div>
    </div>
  );
});
