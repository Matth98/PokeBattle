import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open — works on iOS Safari / PWA.
 *
 * Uses the `position: fixed` technique : saves scrollY, freezes the body at
 * that position, then restores it on unlock. This is the most reliable method
 * on iOS where `overflow: hidden` on <html> still allows momentum scrolling.
 */
export const useBodyScrollLock = (isActive = true) => {
  useEffect(() => {
    if (!isActive) return;

    const scrollY = window.scrollY;
    const body = document.body;

    body.style.position   = 'fixed';
    body.style.top        = `-${scrollY}px`;
    body.style.left       = '0';
    body.style.right      = '0';
    body.style.overflowY  = 'scroll'; // garde la scrollbar pour éviter le layout shift

    return () => {
      body.style.position  = '';
      body.style.top       = '';
      body.style.left      = '';
      body.style.right     = '';
      body.style.overflowY = '';
      window.scrollTo(0, scrollY);
    };
  }, [isActive]);
};
