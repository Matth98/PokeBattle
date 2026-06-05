import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open — works on iOS Safari / PWA.
 *
 * Applies overflow:hidden on both <html> and <body> (needed for iOS),
 * and blocks touchmove events as a safety net for momentum scroll bleed.
 * Does NOT use position:fixed to avoid layout shifts on safe-area / nav bar.
 *
 * @param {boolean} isActive - true to lock (default), false to unlock.
 */
export const useBodyScrollLock = (isActive = true) => {
  useEffect(() => {
    if (!isActive) return;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';

    const preventTouchMove = (e) => {
      let node = e.target;
      while (node && node !== html) {
        if (node.dataset?.scrollLockIgnore !== undefined) return;
        if (node.nodeType === 1) {
          const overflowY = window.getComputedStyle(node).overflowY;
          if (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            node.scrollHeight > node.clientHeight
          ) return;
        }
        node = node.parentElement;
      }
      e.preventDefault();
    };

    document.addEventListener('touchmove', preventTouchMove, { passive: false });

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      document.removeEventListener('touchmove', preventTouchMove);
    };
  }, [isActive]);
};
