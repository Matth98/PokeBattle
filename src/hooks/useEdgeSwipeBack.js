import { useRef, useEffect } from 'react';

const EDGE_THRESHOLD = 22;
const SWIPE_THRESHOLD = 80;
const SLIDE_OUT_MS = 220;
const SPRING_BACK_MS = 200;
const PARALLAX_RATIO = 0.25;
const FG_DIM_MAX = 0.25;

function bgInitialX() {
  return -window.innerWidth * PARALLAX_RATIO;
}

export function useEdgeSwipeBack({ onBack, enabled, bgRef = null, fgOverlayRef = null }) {
  const pageRef = useRef(null);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const lockedAxisRef = useRef(null);
  const activeRef = useRef(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const resetStyles = () => {
      if (pageRef.current) {
        pageRef.current.style.transition = '';
        pageRef.current.style.transform = '';
      }
      if (bgRef?.current) {
        bgRef.current.style.transition = '';
        bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
      }
      if (fgOverlayRef?.current) {
        fgOverlayRef.current.style.transition = '';
        fgOverlayRef.current.style.opacity = '0';
      }
    };

    if (!enabled) {
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
      resetStyles();
      return;
    }

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch.clientX >= EDGE_THRESHOLD) return;
      clearTimeout(timeoutRef.current);
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      lockedAxisRef.current = null;
      activeRef.current = true;
    };

    const handleTouchMove = (e) => {
      if (!activeRef.current) return;
      const touch = e.touches[0];
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      if (lockedAxisRef.current === null) {
        if (Math.abs(dx) + Math.abs(dy) < 6) return;
        lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (lockedAxisRef.current === 'y') {
          activeRef.current = false;
          return;
        }
      }

      if (lockedAxisRef.current !== 'x') return;

      e.preventDefault();

      const clampedDx = Math.max(0, dx);
      if (pageRef.current) {
        pageRef.current.style.transition = 'none';
        pageRef.current.style.transform = `translateX(${clampedDx}px)`;
      }
      if (bgRef?.current) {
        bgRef.current.style.transition = 'none';
        bgRef.current.style.transform = `translateX(${bgInitialX() + clampedDx * PARALLAX_RATIO}px)`;
      }
      if (fgOverlayRef?.current) {
        fgOverlayRef.current.style.transition = 'none';
        fgOverlayRef.current.style.opacity = String(Math.min(1, (clampedDx / window.innerWidth) * FG_DIM_MAX));
      }
    };

    const handleTouchEnd = (e) => {
      if (!activeRef.current) return;

      const touch = e.changedTouches[0];
      const dx = startXRef.current !== null ? touch.clientX - startXRef.current : 0;
      const wasHorizontal = lockedAxisRef.current === 'x';

      activeRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
      lockedAxisRef.current = null;

      if (!wasHorizontal) {
        resetStyles();
        return;
      }

      if (dx >= SWIPE_THRESHOLD) {
        if (pageRef.current) {
          pageRef.current.style.transition = `transform ${SLIDE_OUT_MS}ms ease-in`;
          pageRef.current.style.transform = `translateX(${window.innerWidth}px)`;
        }
        if (bgRef?.current) {
          bgRef.current.style.transition = `transform ${SLIDE_OUT_MS}ms ease-in`;
          bgRef.current.style.transform = 'translateX(0px)';
        }
        if (fgOverlayRef?.current) {
          fgOverlayRef.current.style.transition = `opacity ${SLIDE_OUT_MS}ms ease-in`;
          fgOverlayRef.current.style.opacity = String(FG_DIM_MAX);
        }
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          resetStyles();
          onBackRef.current();
        }, SLIDE_OUT_MS);
      } else {
        if (pageRef.current) {
          pageRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
          pageRef.current.style.transform = 'translateX(0)';
        }
        if (bgRef?.current) {
          bgRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
          bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
        }
        if (fgOverlayRef?.current) {
          fgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
          fgOverlayRef.current.style.opacity = '0';
        }
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          resetStyles();
        }, SPRING_BACK_MS);
      }
    };

    const handleTouchCancel = () => {
      if (!activeRef.current) return;
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
      lockedAxisRef.current = null;
      if (pageRef.current) {
        pageRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
        pageRef.current.style.transform = 'translateX(0)';
      }
      if (bgRef?.current) {
        bgRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
        bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
      }
      if (fgOverlayRef?.current) {
        fgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
        fgOverlayRef.current.style.opacity = '0';
      }
      timeoutRef.current = setTimeout(() => {
        resetStyles();
      }, SPRING_BACK_MS);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
    };
  }, [enabled]); // bgRef est un objet ref stable (useRef) - son identité ne change jamais

  return pageRef;
}
