// Mano del jugador: tercio inferior de la pantalla de partida. Contrato P14,
// ampliado a petición de Unai con una interacción más directa que la barra
// de botones original:
// - El tamaño de carta es CONTINUO, no un paso fijo ('sm'/'md'/'lg'): ocupa
//   siempre el ancho disponible completo (vía ResizeObserver sobre el
//   contenedor), repartido entre las cartas de la mano con un solape fijo.
//   Con pocas cartas, cada una sale más grande; con muchas, más pequeña --
//   pero siempre llenando el ancho, nunca dejando hueco vacío ni necesitando
//   scroll. Se consigue igual que CenterTable.tsx (P15) escala mazo/descarte
//   en /mesa: envolviendo <PlayingCard> en un contenedor de ancho en px y
//   forzando el <svg> interior a llenarlo (`[&_svg]:h-full [&_svg]:w-full`),
//   apoyándose en que su `viewBox` mantiene la proporción 2:3 al escalar.
// - Toque para seleccionar; toque otra vez la MISMA carta ya seleccionada
//   para descartarla -- ya no hace falta un botón de confirmación aparte.
//   Si esa carta también permite cerrar la ronda, GameScreen.tsx pregunta
//   antes de decidir por el jugador (cerrar es irreversible y quizá
//   prefiera seguir jugando buscando mejor jugada).
// - Arrastrar para reordenar (igual que antes): arrastre a mano con eventos
//   de puntero, sin librerías de drag-and-drop.
// - Arrastrar una carta HACIA ARRIBA (hacia la mesa) más allá de un umbral,
//   en vez de reordenarla, la descarta al soltar -- "lanzarla a la
//   mesa", como haría alguien con cartas físicas en la mano. Las cartas usan
//   `touch-action: none` (no `pan-y`, que tenían antes): con `pan-y` el
//   propio navegador se queda el gesto vertical como scroll nativo de la
//   página y JS nunca llega a ver el arrastre hacia arriba -- por eso no
//   funcionaba en el móvil.
'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { parseCardId, rankPosition, type CardId, type Suit } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { useRondaStore } from '@/lib/store';
import { pointsFor } from '@/lib/cardPoints';
import {
  CARD_DRAG_ACTIVATION_PX,
  cardDragIntent,
  isUpwardCardFling,
  pointInsideExpandedRect,
  type CardDragIntent,
} from '@/lib/card-gesture';
import type { DropTarget } from './CommonArea';

export interface HandProps {
  hand: CardId[];
  lockedCardId: CardId | null;
  selected: CardId | null;
  /** Primer toque sobre una carta no seleccionada: la selecciona. */
  onSelect: (cardId: CardId) => void;
  /** Segundo toque o arrastre al montón: confirma la carta con un único gesto. */
  onCommit: (cardId: CardId, target: DropTarget) => void;
  onDropTargetChange: (target: DropTarget | null) => void;
}

// Fracción de cada carta que tapa la siguiente (0.35 = se ve un 65% de
// cada una salvo la primera). El ancho de carta se despeja de esa fracción
// y del ancho disponible: cardWidth = W / (1 + (N-1) * (1 - OVERLAP)).
const OVERLAP_FRACTION = 0.35;
const MIN_CARD_WIDTH = 48;
const MAX_CARD_WIDTH = 112;
const CARD_ASPECT = 108 / 72; // alto/ancho del viewBox de PlayingCard (2:3)

interface DragState {
  cardId: CardId;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originIndex: number;
  initialOrder: CardId[];
  moved: boolean;
  intent: CardDragIntent;
  dropTarget: DropTarget | null;
}

interface DragVisual {
  cardId: CardId;
  x: number;
  y: number;
  lift: number;
}

type SortMode = 'suit' | 'rank';

const SUIT_ORDER: readonly Suit[] = ['oros', 'copas', 'espadas', 'bastos'];

function sortCards(cards: CardId[], mode: SortMode): CardId[] {
  return [...cards].sort((a, b) => {
    const parsedA = parseCardId(a);
    const parsedB = parseCardId(b);
    if (!parsedA.ok || !parsedB.ok) return a.localeCompare(b);

    const suitA = SUIT_ORDER.indexOf(parsedA.value.suit);
    const suitB = SUIT_ORDER.indexOf(parsedB.value.suit);
    const rankA = rankPosition(parsedA.value.rank);
    const rankB = rankPosition(parsedB.value.rank);
    const primary = mode === 'suit' ? suitA - suitB : rankA - rankB;
    if (primary !== 0) return primary;
    const secondary = mode === 'suit' ? rankA - rankB : suitA - suitB;
    return secondary !== 0 ? secondary : a.localeCompare(b);
  });
}

export function Hand({
  hand,
  lockedCardId,
  selected,
  onSelect,
  onCommit,
  onDropTargetChange,
}: HandProps) {
  const [order, setOrder] = useState<CardId[]>(hand);
  const orderRef = useRef<CardId[]>(hand);
  const [containerWidth, setContainerWidth] = useState(360);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const visualFrame = useRef<number | null>(null);
  const pendingVisual = useRef<DragVisual | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<CardId | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [dragLift, setDragLift] = useState(0);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  // La mano solo la resincronizamos cuando cambia el *contenido* real que
  // manda el servidor (nueva carta robada, descartada...), no en cada
  // render: así un reordenamiento local a medio arrastre no se pisa solo.
  const handKey = hand.join('|');
  useEffect(() => {
    orderRef.current = hand;
    setOrder(hand);
  }, [handKey]);

  useEffect(() => {
    return () => {
      if (visualFrame.current !== null) window.cancelAnimationFrame(visualFrame.current);
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Ancho de carta continuo: llena SIEMPRE el ancho disponible entre
  // MIN_CARD_WIDTH y MAX_CARD_WIDTH, repartido entre las cartas de la mano
  // con el solape fijo de arriba. Menos cartas -> cada una más grande.
  const n = Math.max(order.length, 1);
  const rawWidth = containerWidth / (1 + (n - 1) * (1 - OVERLAP_FRACTION));
  const cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, rawWidth));
  const slot = cardWidth * (1 - OVERLAP_FRACTION);

  function handlePointerDown(cardId: CardId, index: number, e: ReactPointerEvent<HTMLDivElement>) {
    // preventDefault además de `touch-action: none` (más abajo): algunos
    // navegadores móviles, si el dedo se para un instante antes de arrastrar
    // (gesto natural de "coger la carta"), intentan abrir su menú nativo de
    // pulsación larga sobre la imagen/SVG y cancelan el puntero a medio
    // gesto -- esto lo corta de raíz antes de que llegue a pasar.
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      cardId,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originIndex: index,
      initialOrder: [...orderRef.current],
      moved: false,
      intent: 'pending',
      dropTarget: null,
    };
    onDropTargetChange(null);
  }

  function queueDragVisual(visual: DragVisual) {
    pendingVisual.current = visual;
    if (visualFrame.current !== null) return;
    visualFrame.current = window.requestAnimationFrame(() => {
      visualFrame.current = null;
      const next = pendingVisual.current;
      if (!next) return;
      setDraggingCardId(next.cardId);
      setDragPosition({ x: next.x, y: next.y });
      setDragLift(next.lift);
    });
  }

  function cancelDragVisual() {
    pendingVisual.current = null;
    if (visualFrame.current !== null) {
      window.cancelAnimationFrame(visualFrame.current);
      visualFrame.current = null;
    }
  }

  function findDropTarget(clientX: number, clientY: number): DropTarget | null {
    const element = document.elementFromPoint(clientX, clientY);
    const zone = element?.closest<HTMLElement>('[data-drop-target]');
    const target = zone?.dataset.dropTarget;
    if (target === 'discard') return 'discard';

    const discardZone = document.querySelector<HTMLElement>('[data-drop-target="discard"]');
    if (
      discardZone &&
      pointInsideExpandedRect(clientX, clientY, discardZone.getBoundingClientRect())
    ) {
      return 'discard';
    }
    return null;
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();

    const deltaX = e.clientX - drag.startClientX;
    const deltaY = e.clientY - drag.startClientY;
    if (Math.hypot(deltaX, deltaY) >= CARD_DRAG_ACTIVATION_PX) drag.moved = true;
    if (drag.intent === 'pending') drag.intent = cardDragIntent(deltaX, deltaY);

    const dropTarget =
      findDropTarget(e.clientX, e.clientY) ??
      (drag.intent === 'play' &&
      isUpwardCardFling(
        drag.startClientX,
        drag.startClientY,
        e.clientX,
        e.clientY,
      )
        ? 'discard'
        : null);
    if (dropTarget !== drag.dropTarget) {
      drag.dropTarget = dropTarget;
      onDropTargetChange(dropTarget);
    }
    queueDragVisual({
      cardId: drag.cardId,
      x: e.clientX,
      y: e.clientY,
      lift: dropTarget ? Math.min(-24, deltaY / 2) : Math.min(0, deltaY / 3),
    });

    // Mientras la carta estÃ¡ sobre un cajÃ³n, el destino explÃ­cito manda
    // sobre el arrastre horizontal de reordenaciÃ³n.
    if (dropTarget || drag.intent === 'play') return;

    const currentOrder = orderRef.current;
    const currentIndex = currentOrder.indexOf(drag.cardId);
    if (currentIndex === -1) return;

    const shift = Math.round(deltaX / slot);
    const targetIndex = Math.min(Math.max(drag.originIndex + shift, 0), currentOrder.length - 1);
    if (targetIndex === currentIndex) return;

    const next = [...currentOrder];
    next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, drag.cardId);
    orderRef.current = next;
    setOrder(next);
  }

  function finishPointer(e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) {
    const drag = dragState.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dropTarget = cancelled
      ? null
      : findDropTarget(e.clientX, e.clientY) ??
        (isUpwardCardFling(
          drag.startClientX,
          drag.startClientY,
          e.clientX,
          e.clientY,
        )
          ? 'discard'
          : drag.dropTarget);
    const finalOrder = orderRef.current;
    cancelDragVisual();
    dragState.current = null;
    setDraggingCardId(null);
    setDragPosition(null);
    setDragLift(0);
    onDropTargetChange(null);

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Algunos WebViews liberan la captura antes de emitir pointerup/cancel.
    }

    if (cancelled) {
      orderRef.current = drag.initialOrder;
      setOrder(drag.initialOrder);
      return;
    }

    if (!drag.moved) {
      // Toque simple: la primera vez selecciona; si ya estaba seleccionada,
      // la segunda vez hace un descarte normal, nunca un cierre accidental.
      if (drag.cardId === selected) onCommit(drag.cardId, 'discard');
      else onSelect(drag.cardId);
      return;
    }

    if (dropTarget) {
      onCommit(drag.cardId, dropTarget);
      return;
    }

    // El arrastre ya reordenó `order` en vivo; ahora se confirma al
    // servidor. `sortHand` no consume turno (contrato §2.6).
    if (finalOrder.join('|') !== drag.initialOrder.join('|')) {
      void useRondaStore.getState().sendAction({ type: 'sortHand', order: finalOrder });
      return;
    }

    // Un desplazamiento corto hacia arriba no debe sentirse como un toque
    // perdido: si no alcanzó el umbral de lanzamiento, deja la carta elegida.
    onSelect(drag.cardId);
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    finishPointer(e, false);
  }

  function handlePointerCancel(e: ReactPointerEvent<HTMLDivElement>) {
    finishPointer(e, true);
  }

  function handleLostPointerCapture(e: ReactPointerEvent<HTMLDivElement>) {
    // Salvaguarda para WebViews que pierden la captura sin enviar pointerup:
    // si el gesto seguía vivo, se resuelve con la última posición disponible.
    if (dragState.current) finishPointer(e, false);
  }

  function handleSort(mode: SortMode) {
    const next = sortCards(order, mode);
    orderRef.current = next;
    setOrder(next);
    setSortMenuOpen(false);
    void useRondaStore.getState().sendAction({ type: 'sortHand', order: next });
  }

  const dragPreview =
    typeof document !== 'undefined' && draggingCardId && dragPosition
      ? createPortal(
          <div
            aria-hidden="true"
            className="pointer-events-none fixed z-[10000]"
            style={{
              left: dragPosition.x,
              top: dragPosition.y,
              transform: 'translate(-50%, -88%) rotate(-3deg) scale(1.06)',
              filter: 'drop-shadow(0 16px 18px rgb(0 0 0 / 0.48))',
            }}
          >
            <div
              className="[&_svg]:h-full [&_svg]:w-full"
              style={{ width: cardWidth, height: cardWidth * CARD_ASPECT }}
            >
              <PlayingCard cardId={draggingCardId} size="md" />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="game-hand flex flex-col gap-2 px-4 pb-4 pt-3">
      <div className="flex items-center justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="text-14 font-semibold text-hueso">Tu mano</h2>
          <span className="drag-instruction">Desliza para jugar</span>
        </div>
        {/* Contrato §8.5.2 / P18: zona táctil mínima 56px -- se mantiene el
         * min-h-14 por defecto del Button (sin min-h-0), solo se recorta el
         * padding horizontal para que quepa junto al título "Tu mano". */}
        <div className="relative">
          <Button
            variant="ghost"
            onClick={() => setSortMenuOpen((open) => !open)}
            aria-expanded={sortMenuOpen}
            className="min-h-10 px-3 text-12"
          >
            Ordenar
          </Button>
          {sortMenuOpen ? (
            <div className="absolute right-0 top-full z-30 mt-1 flex gap-1 rounded-lg border border-linea bg-mesa p-1 shadow-lg">
              <button
                type="button"
                onClick={() => handleSort('suit')}
                className="min-h-10 rounded-md px-3 text-12 text-hueso hover:bg-linea"
              >
                Por palo
              </button>
              <button
                type="button"
                onClick={() => handleSort('rank')}
                className="min-h-10 rounded-md px-3 text-12 text-hueso hover:bg-linea"
              >
                Por número
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={containerRef}
        className="game-hand-scroll flex touch-pan-y items-end overflow-x-auto"
      >
        {order.map((cardId, i) => {
          const isLocked = cardId === lockedCardId;
          const isDragging = cardId === draggingCardId;
          return (
            <div
              key={cardId}
              onPointerDown={(e) => handlePointerDown(cardId, i, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onLostPointerCapture={handleLostPointerCapture}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                marginLeft: i === 0 ? 0 : -(cardWidth - slot),
                // 'none', no 'pan-y': el arrastre hacia arriba tiene que
                // llegar a nuestro handlePointerMove, no consumirlo el
                // navegador como scroll vertical nativo de la página.
                touchAction: 'none',
                WebkitTouchCallout: 'none',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                opacity: isDragging ? 0.18 : 1,
                transform: isDragging ? `translateY(${dragLift}px)` : undefined,
                transition: isDragging ? 'none' : 'transform 150ms ease',
                // La carta seleccionada (o la que se está arrastrando) se
                // eleva por encima de sus vecinas: si no, al levantarse con
                // el translateY de PlayingCard, las cartas siguientes (que
                // se pintan después, más "arriba" en el z-order natural) le
                // tapan la parte de arriba.
                zIndex: isDragging || cardId === selected ? 10 : undefined,
              }}
              className="relative flex flex-shrink-0 flex-col items-center gap-1"
            >
              <div
                className="[&_svg]:h-full [&_svg]:w-full"
                style={{ width: cardWidth, height: cardWidth * CARD_ASPECT }}
              >
                <PlayingCard cardId={cardId} size="md" selected={cardId === selected} />
              </div>
              <span className="font-mono text-12 text-humo">{pointsFor(cardId)}</span>
              {isLocked ? <Pill className="text-12">Bloqueada</Pill> : null}
            </div>
          );
        })}
      </div>
      {dragPreview}
    </div>
  );
}
