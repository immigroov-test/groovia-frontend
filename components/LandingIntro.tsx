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

// The whole landing as one tight, choreographed column (no full-height section voids):
//   1 headline + globe (at the top)  ->  2 the three boxes  ->  3 "Chat with Groovia?"
//   (a clickable heading) + running ticker  ->  (tap the heading) first message.
// Beats sit close together; on short screens the column scrolls itself to follow the newest
// beat only when it's below the fold, so it fits and flows on any screen size.
interface Props {
  hideGif: boolean;         // mobile: drop the globe after first scroll
  showWelcome: boolean;     // reveal the first message (driven by the parent)
  onReveal: () => void;     // user tapped the "Chat with Groovia?" heading
}

export const LandingIntro = forwardRef<HTMLDivElement, Props>(function LandingIntro(
  { hideGif, showWelcome, onReveal },
  ref,
) {
  const b = UI_CONTENT.brandIntro;
  const hero = UI_CONTENT.hero;

  // beat: 0 nothing, 1 headline+globe, 2 boxes, 3 "Chat with Groovia?" + ticker.
  const [beat, setBeat] = useState(0);
  const boxesRef = useRef<HTMLDivElement>(null);
  const grooviaRef = useRef<HTMLDivElement>(null);
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Wait out the one-time logo splash on a first visit so the headline doesn't start
    // underneath it.
    const splashPending = !window.localStorage.getItem('groovia.introSeen');
    const base = splashPending ? 2300 : 300;
    const timers = [
      window.setTimeout(() => setBeat(1), base),          // headline + globe
      window.setTimeout(() => setBeat(2), base + 2400),   // boxes
      window.setTimeout(() => setBeat(3), base + 4400),   // Chat with Groovia? + ticker
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Bring the newest element up as it appears, stopping right at it (no overshoot into blank
  // space). Only scrolls when the element is below the fold, so a big screen never moves.
  const followIfBelow = (el: HTMLElement | null) => {
    if (el && el.getBoundingClientRect().bottom > window.innerHeight - 8) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };
  useEffect(() => { if (beat === 2) followIfBelow(boxesRef.current); }, [beat]);
  useEffect(() => { if (beat === 3) followIfBelow(grooviaRef.current); }, [beat]);
  useEffect(() => { if (showWelcome) followIfBelow(messageRef.current); }, [showWelcome]);

  const rise = (on: boolean, delay = 0) => ({
    initial: { opacity: 0, y: 22 },
    animate: on ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 },
    transition: { duration: 0.6, delay, ease: EASE },
  });

  return (
    <div ref={ref} className="relative z-10 w-full max-w-4xl mx-auto px-5 sm:px-8 pt-6 sm:pt-10 flex flex-col items-center text-center">
      {/* Beat 1: headline + globe, at the top. */}
      <motion.div {...rise(beat >= 1)} className="w-full">
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
          <h1 className="min-h-[3rem] sm:min-h-[6rem] text-lg sm:text-4xl font-bold tracking-tight leading-[1.15] text-center sm:text-left bg-gradient-to-r from-[#00377d] via-[#0a4fa0] to-[#fe9d1c] bg-clip-text text-transparent">
            <TypeText text={b.headline} active={beat >= 1} speed={HEAD_SPEED} />
          </h1>
        </div>
      </motion.div>

      {/* Beat 2: the three boxes. */}
      <div ref={boxesRef} className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full">
        {b.cards.map((text, i) => {
          const Icon = CARD_ICONS[i % CARD_ICONS.length];
          return (
            <motion.div key={text} {...rise(beat >= 2, 0.1 + i * 0.12)}>
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

      {/* Beat 3: "Chat with Groovia?" is a button that reveals the first message. No hard
          border - the same rotating orange/blue glow as the chat box signals it's tappable. */}
      <motion.div ref={grooviaRef} {...rise(beat >= 3)} className="mt-10 w-full flex flex-col items-center">
        <button
          type="button"
          onClick={onReveal}
          aria-label="Reveal the first message"
          className="composer-glow cursor-pointer select-none rounded-2xl bg-card/85 px-5 py-2.5 hover:bg-card transition-colors focus:outline-none"
        >
          <span className="text-xl sm:text-3xl font-bold tracking-tight leading-tight bg-gradient-to-r from-brand-900 to-accent-500 bg-clip-text text-transparent">
            <TypeText text={hero.title} active={beat >= 3} speed={60} />
          </span>
        </button>
        <div className="mt-4 w-full">
          <CyclingText lines={hero.features} active={beat >= 3} className="h-8 sm:h-9" />
        </div>
      </motion.div>

      {/* The first message, revealed when the heading is tapped. No reserved height, so
          nothing sits as blank space before it's shown. */}
      <div ref={messageRef} className="mt-4 mb-8 w-full flex flex-col items-center">
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
