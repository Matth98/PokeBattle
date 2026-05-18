import React, { useRef, useState, useLayoutEffect } from 'react';

/**
 * Liste réordonnable par drag & drop tactile/souris.
 *
 * Props :
 * - items : tableau (avec id unique)
 * - getKey : (item) => string  — fonction pour extraire la clé React
 * - onReorder : (newItems) => void — appelé quand l'ordre change (au release)
 * - renderItem : (item, dragHandleProps, isDragging) => ReactNode
 *     dragHandleProps doit être étalé sur l'élément qui sert de poignée.
 *
 * Le composant fait suivre le doigt à la ligne tirée, fait glisser les autres
 * lignes pour libérer la place, et commit l'ordre uniquement au relâchement.
 */
export const DraggableList = ({ items, getKey, onReorder, renderItem }) => {
  const itemRefs = useRef([]);
  const itemHeightRef = useRef(0);
  const startYRef = useRef(0);
  const fromIdxRef = useRef(null);

  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragY, setDragY] = useState(0);
  const [targetIdx, setTargetIdx] = useState(null);

  // Calcule l'index cible en fonction du déplacement vertical
  const computeTargetIdx = (deltaY, fromIdx) => {
    const h = itemHeightRef.current || 56;
    const offsetSlots = Math.round(deltaY / h);
    const next = fromIdx + offsetSlots;
    return Math.max(0, Math.min(items.length - 1, next));
  };

  const onPointerDownHandle = (e, idx) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return; // clic gauche seulement
    e.preventDefault();
    e.stopPropagation();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    const itemEl = itemRefs.current[idx];
    itemHeightRef.current = itemEl?.getBoundingClientRect().height || 56;
    startYRef.current = e.clientY;
    fromIdxRef.current = idx;
    setDraggingIdx(idx);
    setTargetIdx(idx);
    setDragY(0);
  };

  const onPointerMoveHandle = (e) => {
    if (fromIdxRef.current === null) return;
    const dy = e.clientY - startYRef.current;
    setDragY(dy);
    setTargetIdx(computeTargetIdx(dy, fromIdxRef.current));
  };

  const onPointerUpHandle = (e) => {
    const fromIdx = fromIdxRef.current;
    if (fromIdx === null) return;
    const toIdx = computeTargetIdx(e.clientY - startYRef.current, fromIdx);
    fromIdxRef.current = null;
    setDraggingIdx(null);
    setTargetIdx(null);
    setDragY(0);
    if (toIdx !== fromIdx) {
      const next = [...items];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      onReorder(next);
    }
  };

  // Si l'utilisateur scrolle ou que le pointer est lâché hors handle, on annule proprement
  useLayoutEffect(() => {
    if (draggingIdx === null) return;
    const cancel = () => {
      fromIdxRef.current = null;
      setDraggingIdx(null);
      setTargetIdx(null);
      setDragY(0);
    };
    window.addEventListener('pointercancel', cancel);
    return () => window.removeEventListener('pointercancel', cancel);
  }, [draggingIdx]);

  return (
    <div>
      {items.map((item, idx) => {
        const isDragging = idx === draggingIdx;
        const h = itemHeightRef.current || 0;
        let translateY = 0;
        if (draggingIdx !== null && targetIdx !== null) {
          if (isDragging) {
            translateY = dragY;
          } else if (draggingIdx < idx && idx <= targetIdx) {
            // l'item tiré descend, ceux entre se décalent vers le haut
            translateY = -h;
          } else if (draggingIdx > idx && idx >= targetIdx) {
            // l'item tiré monte, ceux entre se décalent vers le bas
            translateY = h;
          }
        }

        const dragHandleProps = {
          onPointerDown: (e) => onPointerDownHandle(e, idx),
          onPointerMove: onPointerMoveHandle,
          onPointerUp: onPointerUpHandle,
          style: { touchAction: 'none', cursor: 'grab' },
        };

        return (
          <div
            key={getKey(item)}
            ref={(el) => (itemRefs.current[idx] = el)}
            style={{
              transform: `translateY(${translateY}px)`,
              transition: isDragging ? 'none' : 'transform 0.2s ease',
              zIndex: isDragging ? 10 : 'auto',
              position: 'relative',
              opacity: isDragging ? 0.95 : 1,
              boxShadow: isDragging ? '0 10px 30px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            {renderItem(item, dragHandleProps, isDragging)}
          </div>
        );
      })}
    </div>
  );
};
