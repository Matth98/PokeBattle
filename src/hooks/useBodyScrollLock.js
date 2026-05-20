import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open — works on iOS Safari.
 *
 * iOS ignores `overflow: hidden` on <body> for touch events. The only
 * reliable fix is `position: fixed`, which removes the body from the
 * document flow entirely. We save the current scrollY and restore it
 * on unmount so the page doesn't jump to the top when the modal closes.
 *
 * @param {boolean} isActive - Pass `true` (default) to lock immediately on
 *   mount (use in dedicated modal components). Pass a state boolean for
 *   inline modals so the lock activates/deactivates with the modal.
 */
export const useBodyScrollLock = (isActive = true) => {
  useEffect(() => {
    if (!isActive) return;

    const scrollY = window.scrollY;

    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflowY = 'hidden';

    return () => {
      const savedTop = document.body.style.top;

      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';

      window.scrollTo(0, parseInt(savedTop || '0') * -1);
    };
  }, [isActive]);
};
