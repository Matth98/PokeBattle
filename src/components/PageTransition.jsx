// src/components/PageTransition.jsx
import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const reducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const DURATION = reducedMotion ? 0 : 0.32;
const EASE     = [0.25, 0.46, 0.45, 0.94];

const transition = { type: 'tween', ease: EASE, duration: DURATION };

// direction-aware variants — receives `custom` prop from AnimatePresence
const variants = {
  initial: (direction) => ({
    x: direction === 'pop' ? '-30%' : '100%',
    filter: direction === 'pop' ? 'brightness(0.7)' : 'brightness(1)',
    boxShadow: direction === 'pop' ? 'none' : '-8px 0 20px rgba(0,0,0,0.3)',
  }),
  animate: {
    x: 0,
    filter: 'brightness(1)',
    boxShadow: 'none',
    transition,
  },
  exit: (direction) => ({
    x: direction === 'pop' ? '100%' : '-30%',
    filter: direction === 'pop' ? 'brightness(1)' : 'brightness(0.7)',
    boxShadow: direction === 'pop' ? '-8px 0 20px rgba(0,0,0,0.3)' : 'none',
    transition,
  }),
};

export function PageTransition({ pageKey, direction, children }) {
  return (
    <AnimatePresence mode="popLayout" custom={direction}>
      <motion.div
        key={pageKey}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          willChange: 'transform',
          backgroundColor: 'inherit',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
