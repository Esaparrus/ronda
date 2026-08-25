// Mano de Pocha: tercio inferior de la pantalla de partida, más simple que
// la de Chinchón (Hand.tsx) -- Pocha no tiene combinaciones ni `sortHand`
// en el motor (§10.4), así que no hace falta arrastre ni reordenamiento
// manual. Orden de visualización fijo por palo+rango (ayuda a ver de un
// vistazo con qué se puede asistir). Tocar una carta legal juega directo:
// una sola acción posible, a diferencia de Chinchón no hace falta un
// segundo toque de confirmación.
'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { SUITS, parseCardId, type CardId } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';
import {
  CARD_DRAG_ACTIVATION_PX,
  isUpwardCardFling,
  pointInsideExpandedRect,
} from '@/lib/card-gesture';

export interface PochaHandProps {
  hand: CardId[];
  /** Cartas jugables ahora mismo (obligación de asistir ya resuelta por el servidor). */
  legalCardIds: CardId[];
  /** Si es mi turno de baza: tocar una carta legal la juega. */
  canPlay: boolean;
  onPlay: (cardId: CardId) => void;
  onDropTargetChange?: (active: boolean) => void;
}

const OVERLAP_FRACTION = 0.35;
const MIN_CARD_WIDTH = 48;
const MAX_CARD_WIDTH = 112;
const CARD_ASPECT = 108 / 72;

function sortKey(id: CardId): number {
  const parsed = parseCardId(id);
  if (!parsed.ok || parsed.value.suit === null || parsed.value.rank === null) return 0;
  const suitIndex = SUITS.indexOf(parsed.value.suit);
  return suitIndex * 100 + parsed.value.rank;
}

interface PochaDrag {
  cardId: CardId;
  pointerId: number;
  startX: number;
  startY: number;
  moved: boolean;
  ready: boolean;
}

export function PochaHand({
  hand,
  legalCardIds,
  canPlay,
  onPlay,
  onDropTargetChange,
}: PochaHandProps) {
  const legal = new Set(legalCardIds);
  const ordered = [...hand].sort((a, b) => sortKey(a) - sortKey(b));
  const dragRef = useRef<PochaDrag | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const [containerWidth, setContainerWidth] = useState(320);
  const [dragVisual, setDragVisual] = useState<{
    cardId: CardId;
    x: number;
    y: number;
    ready: boolean;
  } | null>(null);
  const n = Math.max(ordered.length, 1);
  const rawWidth = containerWidth / (1 + (n - 1) * (1 - OVERLAP_FRACTION));
  const cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, rawWidth));
  const desiredSlot = cardWidth * (1 - OVERLAP_FRACTION);
  const availableSlot = n > 1 ? Math.max(1, (containerWidth - cardWidth) / (n - 1)) : 0;
  const slot = Math.min(desiredSlot, availableSlot);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width;
      if (width && width > 0) {
        setContainerWidth((current) => (Math.abs(current - width) > 0.5 ? width : current));
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  function isOverTable(x: number, y: number): boolean {
    const zone = document.querySelector<HTMLElement>('[data-card-drop-target="pocha"]');
    return zone ? pointInsideExpandedRect(x, y, zone.getBoundingClientRect(), 24) : false;
  }

  function handlePointerDown(cardId: CardId, event: ReactPointerEvent<HTMLButtonElement>) {
    if (!canPlay || !legal.has(cardId)) return;
    event.preventDefault();
    suppressClick.current = false;
    dragRef.current = {
      cardId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      ready: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < CARD_DRAG_ACTIVATION_PX) return;
    drag.moved = true;
    event.preventDefault();
    const ready =
      isOverTable(event.clientX, event.clientY) ||
      isUpwardCardFling(drag.startX, drag.startY, event.clientX, event.clientY);
    drag.ready = ready;
    setDragVisual({ cardId: drag.cardId, x: event.clientX, y: event.clientY, ready });
    onDropTargetChange?.(ready);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const shouldPlay =
      !drag.moved ||
      isOverTable(event.clientX, event.clientY) ||
      isUpwardCardFling(drag.startX, drag.startY, event.clientX, event.clientY);
    // El navegador emitirá `click` después de pointerup; la jugada ya se
    // resuelve aquí para poder distinguir toque, arrastre válido y cancelado.
    suppressClick.current = true;
    dragRef.current = null;
    setDragVisual(null);
    onDropTargetChange?.(false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Algunos WebViews liberan la captura antes de pointerup.
    }
    if (shouldPlay) onPlay(drag.cardId);
  }

  function handlePointerCancel() {
    suppressClick.current = true;
    dragRef.current = null;
    setDragVisual(null);
    onDropTargetChange?.(false);
  }

  function handleLostPointerCapture() {
    const drag = dragRef.current;
    if (!drag) return;
    suppressClick.current = true;
    dragRef.current = null;
    setDragVisual(null);
    onDropTargetChange?.(false);
    if (drag.moved && drag.ready) onPlay(drag.cardId);
  }

  return (
    <div className="game-hand flex flex-col gap-2 px-4 pb-4 pt-3">
      <div className="flex items-center gap-2">
        <h2 className="text-14 font-semibold text-hueso">Tu mano</h2>
        {canPlay ? <span className="drag-instruction">Toca o desliza</span> : null}
      </div>
      <div ref={containerRef} className="flex w-full min-w-0 touch-pan-y items-end overflow-hidden">
        {ordered.map((cardId, i) => {
          const isLegal = canPlay && legal.has(cardId);
          return (
            <button
              key={cardId}
              type="button"
              disabled={!isLegal}
              onPointerDown={(event) => handlePointerDown(cardId, event)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onLostPointerCapture={handleLostPointerCapture}
              onContextMenu={(event) => event.preventDefault()}
              onClick={() => {
                if (suppressClick.current) {
                  suppressClick.current = false;
                  return;
                }
                if (!dragRef.current) onPlay(cardId);
              }}
              style={{ marginLeft: i === 0 ? 0 : -(cardWidth - slot) }}
              className={`relative flex flex-shrink-0 touch-none flex-col items-center disabled:cursor-default ${
                dragVisual?.cardId === cardId ? 'opacity-20' : ''
              }`}
            >
              <div
                className="[&_svg]:h-full [&_svg]:w-full"
                style={{ width: cardWidth, height: cardWidth * CARD_ASPECT }}
              >
                <PlayingCard cardId={cardId} size="md" dimmed={!isLegal} />
              </div>
            </button>
          );
        })}
      </div>
      {typeof document !== 'undefined' && dragVisual
        ? createPortal(
            <div
              aria-hidden="true"
              className="pointer-events-none fixed z-[10000] transition-transform"
              style={{
                left: dragVisual.x,
                top: dragVisual.y,
                transform: `translate(-50%, -88%) rotate(-3deg) scale(${dragVisual.ready ? 1.1 : 1.05})`,
                filter: 'drop-shadow(0 16px 18px rgb(0 0 0 / 0.48))',
              }}
            >
              <PlayingCard cardId={dragVisual.cardId} size="md" />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
