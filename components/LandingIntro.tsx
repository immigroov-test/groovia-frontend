'use client';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Users, Globe, Sparkles } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';
import { TypeText } from './TypeText';
import { CyclingText } from './CyclingText';
import { AiAvatar } from './AiAvatar';

const EASE = [0.22, 1, 0.36, 1] as const;
const CARD_ICONS = [Users, Globe, Sparkles];
const HEAD_SPEED = 34;

// The landing as one tight, choreographed column (no full-height section voids):
//   step 1 headline + globe (at the top)  ->  2/3/4 the three boxes come in one by one  ->
//   5 "Chat with Groovia?" (a glowing oval button) + running ticker  ->  (tap) first message.
// As each element appears the column scrolls itself to it (smoothly, stopping right at it),
// so it fits and flows on any screen size.
interface Props {
  hideGif: boolean;
  showWelcome: boolean;
  onReveal: () => void;
}

export const LandingIntro = forwardRef<HTMLDivElement, Props>(function LandingIntro(
  { hideGif, showWelcome, onReveal },
  ref,
) {
  const b = UI_CONTENT.brandIntro;
  const hero = UI_CONTENT.hero;

  // step: 1 headline, 2 box0, 3 box1, 4 box2, 5 "Chat with Groovia?" + ticker.
  const [step, setStep] = useState(0);
  const boxRefs = useRef<(HTMLDivElement | null)[]>([]);
  const grooviaRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait out the one-time logo splash on a first visit.
    const splashPending = !window.localStorage.getItem('groovia.introSeen');
    const base = splashPending ? 2300 : 300;
    const timers = [
      window.setTimeout(() => setStep(1), base),          // headline + globe
      window.setTimeout(() => setStep(2), base + 2400),   // box 1
      window.setTimeout(() => setStep(3), base + 3300),   // box 2
      window.setTimeout(() => setStep(4), base + 4200),   // box 3
      window.setTimeout(() => setStep(5), base + 5300),   // Chat with Groovia? + ticker
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Bring the newest element into view (within the scroll area, above the composer), smoothly
  // and stopping right at it. scrollIntoView is a no-op when it already fits.
  const follow = (el: HTMLElement | null) => el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  useEffect(() => {
    if (step >= 2 && step <= 4) follow(boxRefs.current[step - 2]);
    if (step === 5) follow(grooviaRef.current);
  }, [step]);
  useEffect(() => {
    if (!showWelcome) return;
    const t = window.setTimeout(() => follow(messageRef.current), 90);   // let it render first
    return () => clearTimeout(t);
  }, [showWelcome]);

  const rise = (on: boolean, delay = 0) => ({
    initial: { opacity: 0, y: 22 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { duration: 0.6, delay, ease: EASE },
  });

  return (
    <div ref={ref} className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 flex flex-col items-center text-center">
      {/* Step 1: headline + globe, at the top. */}
      <motion.div {...rise(step >= 1)} className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] items-center gap-4 sm:gap-8">
          {!hideGif && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: step >= 1 ? 1 : 0, scale: step >= 1 ? 1 : 0.85 }}
              transition={{ duration: 0.8, ease: EASE }}
              className="mx-auto sm:mx-0 shrink-0"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/Globe_landingPage_GIF.gif" alt="" aria-hidden className="w-28 h-28 sm:w-44 sm:h-44 object-contain" />
            </motion.div>
          )}
          <h1 className="min-h-[3rem] sm:min-h-[6rem] text-lg sm:text-4xl font-bold tracking-tight leading-[1.15] text-center sm:text-left bg-gradient-to-r from-[#00377d] via-[#0a4fa0] to-[#fe9d1c] bg-clip-text text-transparent">
            <TypeText text={b.headline} active={step >= 1} speed={HEAD_SPEED} />
          </h1>
        </div>
      </motion.div>

      {/* Steps 2-4: the three boxes, one by one. */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
        {b.cards.map((text, i) => {
          const Icon = CARD_ICONS[i % CARD_ICONS.length];
          return (
            <motion.div key={text} ref={(el) => { boxRefs.current[i] = el; }} {...rise(step >= 2 + i)}>
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

      {/* Step 5: "Chat with Groovia?" as a glowing blue+orange oval button that reveals the
          first message. */}
      <motion.div ref={grooviaRef} {...rise(step >= 5)} className="mt-10 w-full flex flex-col items-center">
        <div className="relative">
          {/* Soft blue -> orange glow behind the pill (breathing). */}
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-2 rounded-full bg-gradient-to-r from-blue-600 via-sky-400 to-orange-400 blur-xl opacity-60 animate-pulse"
          />
          <button
            type="button"
            onClick={onReveal}
            aria-label="Reveal the first message"
            className="relative rounded-full bg-gradient-to-r from-[#00377d] via-[#2a63b0] to-[#fe9d1c] px-6 py-2.5 sm:px-7 sm:py-3 text-base sm:text-xl font-bold text-white shadow-lg cursor-pointer hover:brightness-110 transition focus:outline-none focus:ring-2 focus:ring-white/60"
          >
            <TypeText text={hero.title} active={step >= 5} speed={60} />
          </button>
        </div>
        <div className="mt-4 w-full">
          <CyclingText lines={hero.features} active={step >= 5} className="h-8 sm:h-9" />
        </div>
      </motion.div>

      {/* First message, revealed on tap. scroll-mb keeps it clear of the composer. */}
      <div ref={messageRef} className="mt-4 mb-8 w-full flex flex-col items-center scroll-mb-6">
        {showWelcome && (
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
        )}
      </div>
    </div>
  );
});
