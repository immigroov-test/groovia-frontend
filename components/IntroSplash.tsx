'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';

const FLAG = 'groovia.introSeen';

// First-visit-only intro: a blank screen with the Immigroov logo revealed in the centre,
// which then flies to the TopNav's logo spot (top-left) and fades, handing off to the
// real app. Measures the actual nav logo so it lands on it. Shown once per browser.
export function IntroSplash() {
  const [show, setShow] = useState(false);
  const [flying, setFlying] = useState(false);
  const [target, setTarget] = useState<{ x: number; y: number; scale: number } | null>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  // Decide on mount, before paint where possible, to avoid a flash of the app.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(FLAG)) setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    // Measure the nav logo so the splash logo can fly exactly onto it.
    const navImg = document.querySelector('[aria-label="Immigroov home"] img') as HTMLElement | null;
    const logoEl = logoRef.current;
    if (navImg && logoEl) {
      const nav = navImg.getBoundingClientRect();
      const cur = logoEl.getBoundingClientRect();
      if (nav.height && cur.height) {
        setTarget({
          x: (nav.left + nav.width / 2) - (cur.left + cur.width / 2),
          y: (nav.top + nav.height / 2) - (cur.top + cur.height / 2),
          scale: nav.height / cur.height,
        });
      }
    }
    const flyAt = window.setTimeout(() => setFlying(true), 1200);   // reveal + brief hold, then fly
    const endAt = window.setTimeout(() => { localStorage.setItem(FLAG, '1'); setShow(false); }, 2250);
    return () => { clearTimeout(flyAt); clearTimeout(endAt); };
  }, [show]);

  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-50"
      animate={{ opacity: flying ? 0 : 1 }}
      transition={{ duration: 0.9, ease: 'easeInOut' }}
      aria-hidden
    >
      <motion.div
        ref={logoRef}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={
          flying && target
            ? { opacity: 1, scale: target.scale, x: target.x, y: target.y }
            : { opacity: 1, scale: 1, x: 0, y: 0 }
        }
        transition={{ duration: flying ? 0.9 : 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <Image
          src="/Immigroov_Transparent_Logo.png"
          alt="Immigroov"
          width={320}
          height={69}
          priority
          className="w-56 sm:w-64 h-auto"
        />
      </motion.div>
    </motion.div>
  );
}
