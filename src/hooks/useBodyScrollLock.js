import { useEffect } from 'react';

/**
 * Locks body scroll when a modal is open — works on iOS Safari / PWA.
 *
 * Uses `position: fixed` on body (the only approach reliable on iOS) :
 * saves scrollY, freezes the body at that position, restores on unlock.
 *
 * @param {boolean} isActive - true to lock (default), false to unlock.
 */
export const useBodyScrollLock = (isActive = true) => {
  useEffect(() => {
    if (!isActive) return;

    const scrollY = window.scrollY;
    const body    = document.body;

    const prev = {
      position:  body.style.position,
      top:       body.style.top,
      left:      body.style.left,
      right:     body.style.right,
      overflowY: body.style.overflowY,
      width:     body.style.width,
    };

    body.style.position  = 'fixed';
    body.style.top       = `-${scrollY}px`;
    body.style.left      = '0';
    body.style.right     = '0';
    body.style.overflowY = 'scroll';   // évite le layout shift lié à la disparition de la scrollbar
    body.style.width     = '100%';

    return () => {
      body.style.position  = prev.position;
      body.style.top       = prev.top;
      body.style.left      = prev.left;
      body.style.right     = prev.right;
      body.style.overflowY = prev.overflowY;
      body.style.width     = prev.width;
      window.scrollTo(0, scrollY);
    };
  }, [isActive]);
};
