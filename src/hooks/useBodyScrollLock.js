import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open — works on iOS Safari / PWA.
 *
 * Uses a non-passive `touchmove` listener to stop iOS momentum / elastic-bounce
 * scroll from bleeding through the modal overlay. We intentionally do NOT set
 * `overflow: hidden` on <html> because that breaks `position: sticky` on iOS
 * (the scroll container is removed, causing sticky headers to fall out of the
 * viewport) and can reset `window.scrollY` on some iOS versions.
 *
 * Scroll is allowed when the touch target (or any of its ancestors up to
 * <html>) is an element that:
 *   - carries a `data-scroll-lock-ignore` attribute, OR
 *   - has `overflow-y: auto | scroll` AND actually has overflowing content
 *     (scrollHeight > clientHeight).
 *
 * @param {boolean} isActive - Pass `true` (default) to lock immediately on
 *   mount. Pass a state boolean for inline modals.
 */
export const useBodyScrollLock = (isActive = true) => {
  useEffect(() => {
    if (!isActive) return;

    const html = document.documentElement;

    const preventTouchMove = (e) => {
      let node = e.target;

      while (node && node !== html) {
        // Explicit opt-out via data attribute
        if (node.dataset?.scrollLockIgnore !== undefined) return;

        // Auto-detect scrollable containers
        if (node.nodeType === 1) {
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
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, [isActive]);
};
