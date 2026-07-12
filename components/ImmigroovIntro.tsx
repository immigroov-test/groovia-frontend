'use client';
import { forwardRef } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ChevronDown, Users } from 'lucide-react';
import { UI_CONTENT } from '../lib/content';
import { cn } from '../lib/utils';

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 22 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
});

interface Props {
  // Scroll cue is shown only while this section is the one in view (issue #3).
  showCue: boolean;
  onMeetGroovia?: () => void;
}

// Section 1 of the landing: leads with what Immigroov is (peer-to-peer mentoring),
// its differentiator, and a single "Find a Mentor" CTA. Groovia is revealed on scroll.
export const ImmigroovIntro = forwardRef<HTMLElement, Props>(function ImmigroovIntro(
  { showCue, onMeetGroovia },
  ref,
) {
  const b = UI_CONTENT.brandIntro;
  const [pre, post] = b.headline.split(b.emphasis);

  return (
    <section ref={ref} className="relative min-h-full overflow-hidden flex flex-col">
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-5 sm:px-8 py-12">
        <motion.h1
          {...fadeUp(0)}
          className="max-w-4xl text-4xl sm:text-6xl font-bold tracking-tight leading-[1.12] text-brand-900"
        >
          {pre}
          <span className="rounded-md bg-amber-100 px-2 text-brand-900 box-decoration-clone">{b.emphasis}</span>
          {post}
        </motion.h1>

        <motion.p {...fadeUp(0.5)} className="mt-6 max-w-2xl text-base sm:text-lg text-muted leading-relaxed">
          {b.subheading}
        </motion.p>

        <motion.p {...fadeUp(0.7)} className="mt-4 max-w-2xl text-sm sm:text-base font-semibold text-brand-800">
          {b.differentiator}
        </motion.p>

        <motion.div {...fadeUp(0.9)}>
          <Link
            href="/mentors"
            className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-brand-900 text-white text-sm font-semibold hover:bg-brand-800 transition-colors"
          >
            <Users className="h-4 w-4" />
            {b.findMentor}
          </Link>
        </motion.div>
      </div>

      {/* Scroll cue: fades out once the Groovia section is in view, back in at the top. */}
      <button
        onClick={onMeetGroovia}
        aria-hidden={!showCue}
        className={cn(
          'relative z-10 mx-auto mb-7 flex flex-col items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-900',
          'transition-opacity duration-300',
          showCue ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
      >
        {b.scrollCta}
        <span className="flex flex-col items-center -space-y-2.5">
          {[0, 1, 2].map((i) => (
            <ChevronDown key={i} className="h-5 w-5 animate-arrow-cascade" style={{ animationDelay: `${i * 0.25}s` }} />
          ))}
        </span>
      </button>
    </section>
  );
});
