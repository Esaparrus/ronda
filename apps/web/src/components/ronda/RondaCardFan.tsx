'use client';

import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { RondaCardView } from '@ronda/protocol';
import {
  CARD_DRAG_ACTIVATION_PX,
  isUpwardCardFling,
  pointInsideExpandedRect,
} from '@/lib/card-gesture';
import { rondaCardFanLayout, rondaCardFanTop, rondaCardFanTransform } from '@/lib/ronda-card-fan';
import { RondaCard } from './RondaCard';

export interface RondaCardDragState {
  active: boolean;
  overTarget: boolean;
  cardId: string | null;
}

export interface RondaCardFanProps {
  cards: readonly RondaCardView[];
  selectedIds?: ReadonlySet<string>;
  disabledIds?: ReadonlySet<string>;
  onCardClick: (card: RondaCardView) => void;
  /** Activa el gesto de llevar una carta hacia la mesa. */
  dragEnabled?: boolean;
  onCardDrop?: (card: RondaCardView) => void;
  onDragStateChange?: (state: RondaCardDragState) => void;
  emptyLabel?: string;
}

const EMPTY_IDS = new Set<string>();
const DROP_TARGET_MARGIN = 28;

interface DragState {
  card: RondaCardView;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  overTarget: boolean;
}

interface DragVisual {
  card: RondaCardView;
  x: number;
  y: number;
  overTarget: boolean;
}

export function RondaCardFan({
  cards,
  selectedIds = EMPTY_IDS,
  disabledIds = EMPTY_IDS,
  onCardClick,
  dragEnabled = false,
  onCardDrop,
  onDragStateChange,
  emptyLabel = 'No tienes cartas disponibles',
}: RondaCardFanProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClick = useRef(false);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
  const [availableWidth, setAvailableWidth] = useState(344);
  const canDrag = dragEnabled && Boolean(onCardDrop);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const updateWidth = (width: number) => {
      if (width > 0) setAvailableWidth(width);
    };
    updateWidth(stage.getBoundingClientRect().width);

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) updateWidth(width);
    });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  if (cards.length === 0) {
    return (
      <div className="grid min-h-20 place-items-center text-center text-13 text-humo">
        {emptyLabel}
      </div>
    );
  }

  const layout = rondaCardFanLayout(availableWidth, cards.length);
  const startX = Math.max(0, (availableWidth - layout.totalWidth) / 2);

  function notifyDragState(state: RondaCardDragState): void {
    onDragStateChange?.(state);
  }

  function isOverDropTarget(x: number, y: number): boolean {
    const target = document.querySelector<HTMLElement>('[data-ronda-drop-target="table"]');
    return target
      ? pointInsideExpandedRect(x, y, target.getBoundingClientRect(), DROP_TARGET_MARGIN)
      : false;
  }

  function clearDrag(): DragState | null {
    const drag = dragRef.current;
    dragRef.current = null;
    setDragVisual(null);
    notifyDragState({ active: false, overTarget: false, cardId: null });
    return drag;
  }

  function suppressCompatibilityClick(): void {
    suppressClick.current = true;
    // Si el drop cambia la mano, el botón original desaparece antes de que
    // el navegador emita el click compatible. El temporizador evita que el
    // siguiente toque legítimo herede ese bloqueo.
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
  }

  function handlePointerDown(card: RondaCardView, event: ReactPointerEvent<HTMLDivElement>): void {
    if (!canDrag || disabledIds.has(card.id)) return;

    suppressClick.current = false;
    dragRef.current = {
      card,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      overTarget: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < CARD_DRAG_ACTIVATION_PX) return;

    drag.moved = true;
    event.preventDefault();
    const overTarget =
      isOverDropTarget(event.clientX, event.clientY) ||
      isUpwardCardFling(drag.startX, drag.startY, event.clientX, event.clientY);
    drag.overTarget = overTarget;
    setDragVisual({
      card: drag.card,
      x: event.clientX,
      y: event.clientY,
      overTarget,
    });
    notifyDragState({ active: true, overTarget, cardId: drag.card.id });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const overTarget =
      drag.moved &&
      (isOverDropTarget(event.clientX, event.clientY) ||
        drag.overTarget ||
        isUpwardCardFling(drag.startX, drag.startY, event.clientX, event.clientY));
    const card = drag.card;
    if (drag.moved) suppressCompatibilityClick();
    clearDrag();

    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Algunos WebViews liberan la captura antes de pointerup.
    }

    if (!drag.moved) {
      // La captura de puntero puede impedir que ciertos WebViews generen el
      // click compatible. Resolver el toque aquí mantiene la selección igual
      // en Safari móvil, Chrome y ratón, y el siguiente click queda anulado.
      suppressCompatibilityClick();
      onCardClick(card);
      return;
    }

    if (overTarget) onCardDrop?.(card);
  }

  function handlePointerCancel(): void {
    suppressCompatibilityClick();
    clearDrag();
  }

  function handleLostPointerCapture(): void {
    const drag = dragRef.current;
    if (!drag) return;

    const card = drag.card;
    const shouldDrop = drag.moved && drag.overTarget;
    suppressCompatibilityClick();
    clearDrag();
    if (shouldDrop) onCardDrop?.(card);
  }

  return (
    <div
      ref={stageRef}
      className="relative isolate mx-2 w-[calc(100%-1rem)] overflow-visible"
      style={{ height: layout.stageHeight }}
      data-ronda-card-fan
    >
      {cards.map((card, index) => {
        const selected = selectedIds.has(card.id);
        return (
          <div
            key={card.id}
            className={`absolute origin-bottom transition-[left,top,transform] duration-150 ${
              canDrag ? 'touch-none select-none' : ''
            }`}
            style={{
              left: startX + index * layout.slotWidth,
              top: rondaCardFanTop(index, cards.length, selected),
              width: layout.cardWidth,
              zIndex: selected ? cards.length + 2 : index + 1,
              transform: rondaCardFanTransform(index, cards.length, selected),
            }}
            onPointerDown={canDrag ? (event) => handlePointerDown(card, event) : undefined}
            onPointerMove={canDrag ? handlePointerMove : undefined}
            onPointerUp={canDrag ? handlePointerUp : undefined}
            onPointerCancel={canDrag ? handlePointerCancel : undefined}
            onLostPointerCapture={canDrag ? handleLostPointerCapture : undefined}
            onContextMenu={canDrag ? (event) => event.preventDefault() : undefined}
          >
            <RondaCard
              card={card}
              selected={selected}
              disabled={disabledIds.has(card.id)}
              width={layout.cardWidth}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                onCardClick(card);
              }}
            />
          </div>
        );
      })}
      {typeof document !== 'undefined' && dragVisual
        ? createPortal(
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-[10000]"
              style={{
                left: dragVisual.x,
                top: dragVisual.y,
                transform: `translate(-50%, -88%) rotate(-2deg) scale(${dragVisual.overTarget ? 1.08 : 1.04})`,
                filter: 'drop-shadow(0 16px 18px rgb(0 0 0 / 0.38))',
              }}
            >
              <RondaCard card={dragVisual.card} width={layout.cardWidth} />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
