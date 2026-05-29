import { useRef, useEffect } from 'react';

const EDGE_THRESHOLD = 22;
const SWIPE_THRESHOLD = 80;
const SLIDE_OUT_MS = 220;
const SPRING_BACK_MS = 200;
const PARALLAX_RATIO = 0.25;
const FG_DIM_MAX = 0.25;

function bgInitialX() {
  return -window.innerWidth * PARALLAX_RATIO;
}

export function useEdgeSwipeBack({ onBack, enabled, bgRef = null, fgOverlayRef = null, bgOverlayRef = null }) {
  const pageRef = useRef(null);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const lockedAxisRef = useRef(null);
  const activeRef = useRef(false);
  const timeoutRef = useRef(null);
  const snapshotRestoreRef = useRef([]);

  useEffect(() => {
    const resetStyles = () => {
      // Restore snapshotted gradient elements to their original styles
      snapshotRestoreRef.current.forEach(({ el, position, top, left, width, height }) => {
        el.style.position = position;
        el.style.top = top;
        el.style.left = left;
        el.style.width = width;
        el.style.height = height;
      });
      snapshotRestoreRef.current = [];

      if (pageRef.current) {
        pageRef.current.style.transition = '';
        pageRef.current.style.transform = '';
      }
      if (bgRef?.current) {
        bgRef.current.style.transition = '';
        bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
      }
      if (fgOverlayRef?.current) {
        fgOverlayRef.current.style.transition = '';
        fgOverlayRef.current.style.opacity = '0';
      }
      if (bgOverlayRef?.current) {
        bgOverlayRef.current.style.transition = '';
        bgOverlayRef.current.style.opacity = '1';
      }
    };

    if (!enabled) {
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
      resetStyles();
      return;
    }

    // handleTouchMove est défini ici pour que handleTouchStart/End puissent
    // l'ajouter/retirer par closure (même référence de fonction garantie).
    const handleTouchMove = (e) => {
      if (!activeRef.current) {
        // Sécurité : retirer le listener si on se retrouve dans un état incohérent
        document.removeEventListener('touchmove', handleTouchMove);
        return;
      }

      const touch = e.touches[0];
      const dx = touch.clientX - startXRef.current;
      const dy = touch.clientY - startYRef.current;

      if (lockedAxisRef.current === null) {
        if (Math.abs(dx) + Math.abs(dy) < 6) return;
        lockedAxisRef.current = Math.abs(dx) >= Math.abs(dy) * 2 ? 'x' : 'y';
        if (lockedAxisRef.current === 'y') {
          // Scroll vertical confirmé : libérer immédiatement le scroll natif
          activeRef.current = false;
          document.removeEventListener('touchmove', handleTouchMove);
          return;
        }
        // Axe verrouillé sur X : snapshot des éléments position:fixed pour qu'ils
        // ne sautent pas quand pageRef reçoit un transform CSS (qui crée un nouveau
        // containing block). On les bascule en position:absolute avec leurs
        // coordonnées visuelles actuelles — ils suivront alors naturellement le
        // déplacement de pageRef sans recalcul.
        if (pageRef.current) {
          const scrollY = window.scrollY;
          snapshotRestoreRef.current = [];
          pageRef.current.querySelectorAll('[data-scroll-gradient]').forEach((el) => {
            const rect = el.getBoundingClientRect();
            snapshotRestoreRef.current.push({
              el,
              position: el.style.position,
              top: el.style.top,
              left: el.style.left,
              width: el.style.width,
              height: el.style.height,
            });
            el.style.position = 'absolute';
            el.style.top = `${rect.top + scrollY}px`;
            el.style.left = `${rect.left}px`;
            el.style.width = `${rect.width}px`;
            el.style.height = `${rect.height}px`;
          });
        }
      }

      if (lockedAxisRef.current !== 'x') return;

      e.preventDefault();

      const clampedDx = Math.max(0, dx);
      if (pageRef.current) {
        pageRef.current.style.transition = 'none';
        pageRef.current.style.transform = `translateX(${clampedDx}px)`;
      }
      if (bgRef?.current) {
        bgRef.current.style.transition = 'none';
        bgRef.current.style.transform = `translateX(${bgInitialX() + clampedDx * PARALLAX_RATIO}px)`;
      }
      if (fgOverlayRef?.current) {
        fgOverlayRef.current.style.transition = 'none';
        fgOverlayRef.current.style.opacity = String(Math.min(1, (clampedDx / window.innerWidth) * FG_DIM_MAX));
      }
      if (bgOverlayRef?.current) {
        bgOverlayRef.current.style.transition = 'none';
        bgOverlayRef.current.style.opacity = String(Math.max(0, 1 - clampedDx / window.innerWidth));
      }
    };

    const handleTouchStart = (e) => {
      const touch = e.touches[0];
      if (touch.clientX >= EDGE_THRESHOLD) return;
      if (activeRef.current) return; // geste déjà en cours, ignorer
      clearTimeout(timeoutRef.current);
      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      lockedAxisRef.current = null;
      activeRef.current = true;
      // Enregistrer passive:false UNIQUEMENT pour ce geste potentiel depuis le bord
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
    };

    const handleTouchEnd = (e) => {
      // Toujours retirer le listener touchmove, quel que soit l'état
      document.removeEventListener('touchmove', handleTouchMove);
      if (!activeRef.current) return;

      const touch = e.changedTouches[0];
      const dx = startXRef.current !== null ? touch.clientX - startXRef.current : 0;
      const wasHorizontal = lockedAxisRef.current === 'x';

      activeRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
      lockedAxisRef.current = null;

      if (!wasHorizontal) {
        resetStyles();
        return;
      }

      if (dx >= SWIPE_THRESHOLD) {
        if (pageRef.current) {
          pageRef.current.style.transition = `transform ${SLIDE_OUT_MS}ms ease-in`;
          pageRef.current.style.transform = `translateX(${window.innerWidth}px)`;
        }
        if (bgRef?.current) {
          bgRef.current.style.transition = `transform ${SLIDE_OUT_MS}ms ease-in`;
          bgRef.current.style.transform = 'translateX(0px)';
        }
        if (fgOverlayRef?.current) {
          fgOverlayRef.current.style.transition = `opacity ${SLIDE_OUT_MS}ms ease-in`;
          fgOverlayRef.current.style.opacity = String(FG_DIM_MAX);
        }
        if (bgOverlayRef?.current) {
          bgOverlayRef.current.style.transition = `opacity ${SLIDE_OUT_MS}ms ease-in`;
          bgOverlayRef.current.style.opacity = '0';
        }
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          resetStyles();
          onBackRef.current();
        }, SLIDE_OUT_MS);
      } else {
        if (pageRef.current) {
          pageRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
          pageRef.current.style.transform = 'translateX(0)';
        }
        if (bgRef?.current) {
          bgRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
          bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
        }
        if (fgOverlayRef?.current) {
          fgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
          fgOverlayRef.current.style.opacity = '0';
        }
        if (bgOverlayRef?.current) {
          bgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
          bgOverlayRef.current.style.opacity = '1';
        }
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          resetStyles();
        }, SPRING_BACK_MS);
      }
    };

    const handleTouchCancel = () => {
      // Toujours retirer le listener touchmove, quel que soit l'état
      document.removeEventListener('touchmove', handleTouchMove);
      if (!activeRef.current) return;
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
      startXRef.current = null;
      startYRef.current = null;
      lockedAxisRef.current = null;
      if (pageRef.current) {
        pageRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
        pageRef.current.style.transform = 'translateX(0)';
      }
      if (bgRef?.current) {
        bgRef.current.style.transition = `transform ${SPRING_BACK_MS}ms ease-out`;
        bgRef.current.style.transform = `translateX(${bgInitialX()}px)`;
      }
      if (fgOverlayRef?.current) {
        fgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
        fgOverlayRef.current.style.opacity = '0';
      }
      if (bgOverlayRef?.current) {
        bgOverlayRef.current.style.transition = `opacity ${SPRING_BACK_MS}ms ease-out`;
        bgOverlayRef.current.style.opacity = '1';
      }
      timeoutRef.current = setTimeout(() => {
        resetStyles();
      }, SPRING_BACK_MS);
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove); // sécurité si encore enregistré
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchCancel);
      clearTimeout(timeoutRef.current);
      activeRef.current = false;
    };
  }, [enabled]); // bgRef est un objet ref stable (useRef) - son identité ne change jamais

  return pageRef;
}
