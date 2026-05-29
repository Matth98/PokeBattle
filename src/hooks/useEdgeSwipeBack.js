import { useRef, useEffect, useCallback } from 'react';

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

  // Quand le swipe réussit, on ne reset PAS pageRef immédiatement pour éviter un flash.
  // On le fait depuis App.jsx via useLayoutEffect, après que React a commité le nouveau contenu.
  const pendingFgResetRef = useRef(false);

  // Appelé depuis App.jsx useLayoutEffect([currentTab]) après chaque commit de navigation.
  // Nettoie le transform de pageRef seulement après que React a mis le nouveau contenu dedans,
  // ce qui évite de voir brièvement l'ancienne page revenir à translateX(0) avant le re-render.
  const resetFg = useCallback(() => {
    if (!pendingFgResetRef.current) return;
    pendingFgResetRef.current = false;
    if (pageRef.current) {
      pageRef.current.style.transition = '';
      pageRef.current.style.transform = '';
    }
  }, []);

  useEffect(() => {
    const resetStyles = () => {
      if (pageRef.current) {
        pageRef.current.style.transition = '';
        pageRef.current.style.transform = '';
        pageRef.current.querySelectorAll('[data-scroll-gradient]').forEach((el) => {
          el.style.transform = '';
        });
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
      pendingFgResetRef.current = false;
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
        // Axe verrouillé sur X : compenser le décalage de scroll pour que les
        // gradients position:fixed ne sautent pas quand pageRef reçoit un transform.
        if (pageRef.current) {
          const scrollY = window.scrollY;
          if (scrollY > 0) {
            pageRef.current.querySelectorAll('[data-scroll-gradient]').forEach((el) => {
              el.style.transform = `translateY(${scrollY}px)`;
            });
          }
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
          // On NE reset PAS bgRef/bgOverlayRef ici : ils vont se démonter via React
          // juste après onBack(). Les resetter maintenant causerait un flash (bg saute
          // à -25vw) avant que React ait eu le temps de commiter le nouveau rendu.
          // pageRef sera resetté par resetFg() appelé dans useLayoutEffect de App.jsx,
          // APRÈS que React a mis le nouveau contenu dedans.
          pendingFgResetRef.current = true;
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
      pendingFgResetRef.current = false;
    };
  }, [enabled]); // bgRef est un objet ref stable (useRef) - son identité ne change jamais

  return { pageRef, resetFg };
}
