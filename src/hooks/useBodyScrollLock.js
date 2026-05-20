import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open — works on iOS Safari.
 *
 * iOS ignores `overflow: hidden` on <body> for touch events. The only
 * reliable fix is `position: fixed`, which removes the body from the
 * document flow entirely. We save the current scrollY and restore it
 * on unmount so the page doesn't jump to the top when the modal closes.
 */
export const useBodyScrollLock = () => {
  useEffect(() => {
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

      // Restore scroll position — parseInt strips the "px" and the minus sign
      window.scrollTo(0, parseInt(savedTop || '0') * -1);
    };
  }, []);
};
