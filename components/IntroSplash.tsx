'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion } from 'motion/react';

const FLAG = 'groovia.introSeen';

// First-visit-only intro: a blank screen where the Immigroov logo reveals in the centre,
// holds, then plays the reveal in reverse to hide, handing off to the app. Once per browser.
export function IntroSplash() {
  const [show, setShow] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(FLAG)) setShow(true);
  }, []);

  useEffect(() => {
    if (!show) return;
    const hideAt = window.setTimeout(() => setHiding(true), 1300);   // reveal + hold, then reverse
    const endAt = window.setTimeout(() => { localStorage.setItem(FLAG, '1'); setShow(false); }, 2100);
    return () => { clearTimeout(hideAt); clearTimeout(endAt); };
  }, [show]);

  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-50"
      animate={{ opacity: hiding ? 0 : 1 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      aria-hidden
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={hiding ? { opacity: 0, scale: 0.8 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
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
