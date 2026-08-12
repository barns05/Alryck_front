/**
 * useTableDrag — Hook pur de mécanique de glisser-déposer de tables sur un
 * canvas % (0-100). Aucune dépendance entité, aucune persistance : tout est
 * délégué via callbacks (onDrop / onClick). Réutilisable par PlanSpatialView
 * (mode TableEvenement) et PropositionEditor (mode tableau local).
 *
 * Convention : chaque `item` doit porter un `id` stable (index, entity id…).
 * - startDrag(e, item)    : à brancher sur onPointerDown de la table.
 * - posOverride[itemId]   : position live pendant le drag (pour le rendu).
 * - draggingItem           : item en cours de drag (fantôme / mise en évidence).
 * - clic sans déplacement  : délègue à onClick(item) (seuil MOVE_THRESHOLD).
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { clamp } from '@/lib/espaceCoords';

const MOVE_THRESHOLD = 4; // px : en-deçà = clic, au-delà = drag

export function useTableDrag({ containerRef, onDrop, getStartPos, onClick }) {
  const draggingRef = useRef(null);
  const [posOverride, setPosOverride] = useState({});
  const [draggingItem, setDraggingItem] = useState(null);

  // Refs stables pour les handlers window
  const onDropRef = useRef(onDrop); onDropRef.current = onDrop;
  const onClickRef = useRef(onClick); onClickRef.current = onClick;
  const getStartPosRef = useRef(getStartPos); getStartPosRef.current = getStartPos;

  const pointerToPct = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    };
  }, [containerRef]);

  const onMove = useCallback((e) => {
    const d = draggingRef.current;
    if (!d) return;
    const pos = pointerToPct(e.clientX, e.clientY);
    if (!d.moved && Math.hypot(e.clientX - d.startClient.x, e.clientY - d.startClient.y) > MOVE_THRESHOLD) {
      d.moved = true;
    }
    d.pos = pos;
    setPosOverride((o) => ({ ...o, [d.itemId]: pos }));
  }, [pointerToPct]);

  const onUp = useCallback(() => {
    const d = draggingRef.current;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    draggingRef.current = null;
    setDraggingItem(null);
    if (!d) return;
    setPosOverride((o) => {
      const n = { ...o };
      delete n[d.itemId];
      return n;
    });
    if (!d.moved) {
      onClickRef.current?.(d.item);
      return;
    }
    onDropRef.current?.(d.pos, d.itemId, d.item);
  }, [onMove]);

  useEffect(() => () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }, [onMove, onUp]);

  const startDrag = useCallback((e, item) => {
    e.stopPropagation();
    e.preventDefault();
    const pos = getStartPosRef.current?.(item) || { x: 50, y: 50 };
    draggingRef.current = {
      itemId: item.id,
      item,
      startClient: { x: e.clientX, y: e.clientY },
      moved: false,
      pos,
    };
    setDraggingItem(item);
    setPosOverride((o) => ({ ...o, [item.id]: pos }));
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }, [onMove, onUp]);

  return { startDrag, posOverride, draggingItem };
}