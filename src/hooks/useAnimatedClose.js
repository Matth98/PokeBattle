import { useState, useCallback, useRef } from 'react';

/**
 * Delays the actual close callback to let a CSS exit animation play first.
 *
 * Usage:
 *   const { isClosing, handleClose } = useAnimatedClose(onClose, 220);
 *   // apply 'anim-fade-out' / 'anim-slide-down' / 'anim-scale-out' when isClosing=true
 */
export function useAnimatedClose(onClose, duration = 220) {
  const [isClosing, setIsClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onCloseRef.current();
    }, duration);
  }, [duration]);

  return { isClosing, handleClose };
}
