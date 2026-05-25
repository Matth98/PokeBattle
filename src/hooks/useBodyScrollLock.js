import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open — works on iOS Safari / PWA.
 *
 * Two layers of protection:
 * 1. `overflow: hidden` on <html> — prevents programmatic scroll.
 * 2. Non-passive `touchmove` listener on `document` — stops iOS momentum /
 *    elastic-bounce scroll from bleeding through the modal overlay.
 *
 * Scrollable elements inside a modal must carry the `data-scroll-lock-ignore`
 * attribute so their touch events are exempted from prevention.
 *
 * @param {boolean} isActive - Pass `true` (default) to lock immediately on
 *   mount (use in dedicated modal components). Pass a state boolean for
 *   inline modals so the lock activates/deactivates with the modal.
 */
export const useBodyScrollLock = (isActive = true) => {
  useEffect(() => {
    if (!isActive) return;

    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';

    const preventTouchMove = (e) => {
      // Allow touch scrolling inside any element marked as scroll-exempt
      if (e.target.closest?.('[data-scroll-lock-ignore]')) return;
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    return () => {
      html.style.overflow = prev;
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, [isActive]);
};
