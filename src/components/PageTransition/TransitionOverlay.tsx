'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { usePageTransition } from './PageTransitionContext';

export function TransitionOverlay() {
  const router = useRouter();
  const { isTransitioning, transitionOrigin, targetUrl, endTransition } = usePageTransition();

  useEffect(() => {
    if (isTransitioning && targetUrl) {
      // Navigate after the expand animation progresses
      const timer = setTimeout(() => {
        router.push(targetUrl);
      }, 350);

      return () => clearTimeout(timer);
    }
  }, [isTransitioning, targetUrl, router]);

  // End transition after animation completes
  useEffect(() => {
    if (isTransitioning) {
      const timer = setTimeout(() => {
        endTransition();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [isTransitioning, endTransition]);

  // Calculate the scale needed to cover the entire viewport
  const getExpandScale = () => {
    if (!transitionOrigin) return 20;
    const viewportDiagonal = Math.sqrt(
      window.innerWidth ** 2 + window.innerHeight ** 2
    );
    const popupDiagonal = Math.sqrt(
      transitionOrigin.width ** 2 + transitionOrigin.height ** 2
    );
    return Math.ceil((viewportDiagonal / popupDiagonal) * 2.5);
  };

  return (
    <AnimatePresence>
      {isTransitioning && transitionOrigin && (
        <>
          {/* Expanding popup clone */}
          <motion.div
            className="fixed z-[9999] pointer-events-none"
            style={{
              left: transitionOrigin.x - transitionOrigin.width / 2,
              top: transitionOrigin.y - transitionOrigin.height / 2,
              width: transitionOrigin.width,
              height: transitionOrigin.height,
            }}
            initial={{
              scale: 1,
              opacity: 1,
              borderRadius: 12,
            }}
            animate={{
              scale: getExpandScale(),
              opacity: 1,
              borderRadius: 0,
            }}
            transition={{
              duration: 0.5,
              ease: [0.32, 0, 0.67, 0], // ease-in cubic
            }}
          >
            {/* Popup appearance */}
            <div className="w-full h-full bg-white shadow-2xl shadow-slate-400/30 rounded-xl overflow-hidden">
              <div className="w-full h-full bg-gradient-to-b from-white to-slate-50" />
            </div>
          </motion.div>

          {/* Final overlay that fades in to match details page background */}
          <motion.div
            className="fixed inset-0 z-[10000] bg-gradient-to-b from-slate-50 to-slate-100 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.25,
              delay: 0.35,
              ease: 'easeIn',
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
