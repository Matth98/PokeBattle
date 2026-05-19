import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Trash2 } from 'lucide-react';

/**
 * Ligne "swipeable" : un swipe vers la gauche révèle un bouton d'action (suppression).
 *
 * Props :
 * - children : contenu de la ligne
 * - onDelete : callback appelé quand on tape sur le bouton révélé
 * - actionLabel : icône Lucide pour le bouton (élément React, défaut Trash2)
 * - actionWidth : largeur de la zone d'action en pixels (par défaut 88)
 * - threshold : distance de swipe à dépasser pour rester ouvert (par défaut 50)
 * - className : classes appliquées au wrapper externe (utile pour border-radius)
 * - surfaceClass : classes Tailwind pour le fond opaque (défaut 'bg-white').
 *                  CRITIQUE : doit être opaque, sinon l'action rouge transparaît
 *                  quand on tape (active:bg-black/5 sur les enfants devient semi-transparent).
 * - disabled : désactive le swipe (ex: en mode sélection)
 */
export const SwipeableRow = ({
  children,
  onDelete,
  actionLabel,
  actionWidth = 88,
  threshold = 50,
  className = '',
  surfaceClass = 'bg-white',
  disabled = false,
}) => {
  const containerRef = useRef(null);
  const startXRef = useRef(null);
  const startYRef = useRef(null);
  const lockedAxisRef = useRef(null); // 'x' | 'y' | null
  const isOpenRef = useRef(false);
  const currentXRef = useRef(0);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  // Vrai dès que le geste verrouille l'axe horizontal — sert à désactiver le
  // press feedback (scale) du wrapper via la règle CSS [data-swiping] dans index.css
  const [isSwiping, setIsSwiping] = useState(false);

  const applyTranslate = useCallback((x) => {
    currentXRef.current = x;
    setTranslateX(x);
  }, []);

  const close = useCallback(() => {
    applyTranslate(0);
    isOpenRef.current = false;
    setIsOpen(false);
  }, [applyTranslate]);

  const open = useCallback(() => {
    applyTranslate(-actionWidth);
    isOpenRef.current = true;
    setIsOpen(true);
  }, [actionWidth, applyTranslate]);

  // Ferme le swipe si on tape ailleurs dans la page
  useEffect(() => {
    const onDocPointerDown = (e) => {
      if (!isOpenRef.current) return;
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        close();
      }
    };
    document.addEventListener('mousedown', onDocPointerDown);
    document.addEventListener('touchstart', onDocPointerDown, { passive: true });
    return () => {
      document.removeEventListener('mousedown', onDocPointerDown);
      document.removeEventListener('touchstart', onDocPointerDown);
    };
  }, [close]);

  const handleTouchStart = (e) => {
    if (disabled) return;
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    lockedAxisRef.current = null;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (disabled || startXRef.current == null) return;
    const dx = e.touches[0].clientX - startXRef.current;
    const dy = e.touches[0].clientY - startYRef.current;

    // Verrouille l'axe au premier mouvement significatif → évite de bloquer le scroll vertical
    if (lockedAxisRef.current == null) {
      if (Math.abs(dx) + Math.abs(dy) < 6) return;
      lockedAxisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (lockedAxisRef.current === 'x') setIsSwiping(true);
    }
    if (lockedAxisRef.current === 'y') return; // l'utilisateur scrolle, on laisse faire

    const base = isOpenRef.current ? -actionWidth : 0;
    const next = Math.max(-actionWidth, Math.min(0, base + dx));
    applyTranslate(next);
  };

  const handleTouchEnd = () => {
    if (disabled) return;
    setIsDragging(false);
    if (lockedAxisRef.current === 'x') {
      if (currentXRef.current < -threshold) {
        open();
      } else {
        close();
      }
    }
    startXRef.current = null;
    startYRef.current = null;
    lockedAxisRef.current = null;
    setIsSwiping(false);
  };

  const handleConfirmDelete = (e) => {
    e.stopPropagation();
    close();
    onDelete && onDelete();
  };

  // Si la ligne est ouverte, un tap sur le contenu ne doit PAS déclencher
  // l'action sous-jacente (ex: navigation vers le détail) — il referme juste le swipe.
  const handleContentClickCapture = (e) => {
    if (isOpenRef.current) {
      e.stopPropagation();
      e.preventDefault();
      close();
    }
  };

  return (
    <div
      ref={containerRef}
      data-swipe-row=""
      data-swiping={isSwiping ? '' : undefined}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Action révélée derrière — n'est MONTÉE DANS LE DOM que pendant un swipe
          ou quand le swipe est resté ouvert. Sinon : aucun pixel rouge possible. */}
      {(isSwiping || isOpen) && (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-500"
          style={{ width: actionWidth }}
        >
          <button
            type="button"
            onClick={handleConfirmDelete}
            className="w-full h-full text-white font-bold flex items-center justify-center"
            aria-label="Supprimer"
          >
            {actionLabel || <Trash2 size={18} />}
          </button>
        </div>
      )}

      {/* Contenu glissant — fond opaque obligatoire pour masquer l'action rouge */}
      <div
        className={surfaceClass}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          touchAction: 'pan-y',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={handleContentClickCapture}
      >
        {children}
      </div>
    </div>
  );
};
