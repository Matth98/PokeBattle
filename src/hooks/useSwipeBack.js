// src/hooks/useSwipeBack.js
import { useRef, useCallback } from 'react';

const HORIZONTAL_THRESHOLD = 80;   // px — minimum offset to trigger back
const VELOCITY_THRESHOLD   = 500;  // px/s
const AXIS_LOCK_DISTANCE   = 8;    // px — minimum move before locking axis

export function useSwipeBack({ onBack, enabled, elementRef }) {
  const startXRef      = useRef(null);
  const startYRef      = useRef(null);
  const lastXRef       = useRef(null);
  const lastTimeRef    = useRef(null);
  const prevXRef       = useRef(null);
  const prevTimeRef    = useRef(null);
  const lockedAxisRef  = useRef(null); // 'x' | 'y' | null
  const isDraggingRef  = useRef(false);

  const resetState = useCallback(() => {
    startXRef.current     = null;
    startYRef.current     = null;
    lastXRef.current      = null;
    lastTimeRef.current   = null;
    prevXRef.current      = null;
    prevTimeRef.current   = null;
    lockedAxisRef.current = null;
    isDraggingRef.current = false;
  }, []);

  const onTouchStart = useCallback((e) => {
    if (!enabled) return;
    // Ignore if touch starts on a swipeable row (delete gesture)
    if (e.target.closest('[data-swipe-row]')) return;
    startXRef.current    = e.touches[0].clientX;
    startYRef.current    = e.touches[0].clientY;
    lastXRef.current     = e.touches[0].clientX;
    lastTimeRef.current  = Date.now();
  }, [enabled]);

  const onTouchMove = useCallback((e) => {
    if (!enabled || startXRef.current == null) return;

    const x  = e.touches[0].clientX;
    const y  = e.touches[0].clientY;
    const dx = x - startXRef.current;
    const dy = y - startYRef.current;

    // Lock axis once we know direction
    if (lockedAxisRef.current === null && (Math.abs(dx) > AXIS_LOCK_DISTANCE || Math.abs(dy) > AXIS_LOCK_DISTANCE)) {
      lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }

    if (lockedAxisRef.current !== 'x') return;
    if (dx < 0) return; // only right swipe for back

    isDraggingRef.current = true;
    prevXRef.current      = lastXRef.current;
    prevTimeRef.current   = lastTimeRef.current;
    lastXRef.current      = x;
    lastTimeRef.current   = Date.now();

    if (elementRef?.current) {
      elementRef.current.style.transition = 'none';
      elementRef.current.style.transform  = `translateX(${dx}px)`;
    }
  }, [enabled, elementRef]);

  const onTouchCancel = useCallback(() => {
    if (elementRef?.current) {
      elementRef.current.style.transition = 'transform 0.3s ease-out';
      elementRef.current.style.transform  = 'translateX(0)';
    }
    resetState();
  }, [elementRef, resetState]);

  const onTouchEnd = useCallback(() => {
    if (!enabled || !isDraggingRef.current) {
      resetState();
      return;
    }

    const dx       = (lastXRef.current ?? 0) - (startXRef.current ?? 0);
    const recentDx = (lastXRef.current ?? 0) - (prevXRef.current ?? lastXRef.current ?? 0);
    const recentDt = (lastTimeRef.current ?? 0) - (prevTimeRef.current ?? lastTimeRef.current ?? 0);
    const velocity = recentDt > 0 ? (recentDx / recentDt) * 1000 : 0;

    if (dx > HORIZONTAL_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      // Snap forward then navigate — AnimatePresence takes over
      if (elementRef?.current) {
        elementRef.current.style.transition = 'transform 0.15s ease-out';
        elementRef.current.style.transform  = `translateX(100%)`;
      }
      setTimeout(() => onBack?.(), 150);
    } else {
      // Snap back
      if (elementRef?.current) {
        elementRef.current.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        elementRef.current.style.transform  = 'translateX(0)';
      }
    }

    resetState();
  }, [enabled, elementRef, onBack, resetState]);

  return { swipeHandlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel } };
}
