import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open — works on iOS Safari / PWA.
 *
 * Two layers of protection:
 * 1. `overflow: hidden` on <html> — prevents programmatic scroll.
 * 2. Non-passive `touchmove` listener on `document` — stops iOS momentum /
 *    elastic-bounce scroll from bleeding through the modal overlay.
 *
 * Scroll is allowed when the touch target (or any of its ancestors up to
 * <html>) is an element that:
 *   - carries a `data-scroll-lock-ignore` attribute, OR
 *   - has `overflow-y: auto | scroll` AND actually has overflowing content
 *     (scrollHeight > clientHeight).
 *
 * This means no `data-*` attributes are required on scrollable containers —
 * the hook detects them automatically.
 *
 * @param {boolean} isActive - Pass `true` (default) to lock immediately on
 *   mount. Pass a state boolean for inline modals.
 */
export const useBodyScrollLock = (isActive = true) => {
  useEffect(() => {
    if (!isActive) return;

    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';

    const preventTouchMove = (e) => {
      let node = e.target;

      while (node && node !== html) {
        // Explicit opt-out via data attribute
        if (node.dataset?.scrollLockIgnore !== undefined) return;

        // Auto-detect scrollable containers
        if (node.nodeType === 1) { // element nodes only
          const overflowY = window.getComputedStyle(node).overflowY;
          if (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            node.scrollHeight > node.clientHeight
          ) {
            return;
          }
        }

        node = node.parentElement;
      }

      e.preventDefault();
    };

    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    return () => {
      html.style.overflow = prev;
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, [isActive]);
};
