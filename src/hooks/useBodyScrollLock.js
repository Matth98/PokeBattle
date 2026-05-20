import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open — works on iOS Safari / PWA.
 *
 * We apply `overflow: hidden` on <html> rather than `position: fixed` on
 * <body>. The `position: fixed` approach causes iOS to re-layout all fixed
 * elements (including the bottom navigation bar), producing a visible jump
 * when the modal opens or closes. In a PWA the body never scrolls anyway,
 * so `overflow: hidden` on the root element is sufficient to prevent touch
 * events from bleeding through the modal overlay.
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

    return () => {
      html.style.overflow = prev;
    };
  }, [isActive]);
};
