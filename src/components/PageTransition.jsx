// src/components/PageTransition.jsx
import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const EASE = [0.25, 0.46, 0.45, 0.94];

// direction-aware variants — receives `custom` prop from AnimatePresence
const variants = {
  initial: (direction) => ({
    x: direction === 'pop' ? '-30%' : '100%',
    filter: direction === 'pop' ? 'brightness(0.7)' : 'brightness(1)',
    boxShadow: direction === 'pop' ? 'none' : '-8px 0 20px rgba(0,0,0,0.3)',
  }),
  animate: (direction) => ({
    x: 0,
    filter: 'brightness(1)',
    boxShadow: 'none',
  }),
  exit: (direction) => ({
    x: direction === 'pop' ? '100%' : '-30%',
    filter: direction === 'pop' ? 'brightness(1)' : 'brightness(0.7)',
    boxShadow: direction === 'pop' ? '-8px 0 20px rgba(0,0,0,0.3)' : 'none',
  }),
};

export function PageTransition({ pageKey, direction, children, backgroundColor = '#ffffff' }) {
  const shouldReduceMotion = useReducedMotion();
  const duration = shouldReduceMotion ? 0 : 0.32;
  const transition = { type: 'tween', ease: EASE, duration };

  return (
    <AnimatePresence mode="popLayout" custom={direction}>
      <motion.div
        key={pageKey}
        custom={direction}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          willChange: 'transform',
          backgroundColor,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
