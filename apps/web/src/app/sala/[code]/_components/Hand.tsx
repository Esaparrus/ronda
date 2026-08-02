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
//   para descartarla (o cerrar, si es una carta que cierra) -- ya no hace
//   falta un botón de confirmación aparte.
// - Arrastrar para reordenar (igual que antes): arrastre a mano con eventos
//   de puntero, sin librerías de drag-and-drop.
// - Arrastrar una carta HACIA ARRIBA (hacia la mesa) más allá de un umbral,
//   en vez de reordenarla, la descarta/cierra al soltar -- "lanzarla a la
//   mesa", como haría alguien con cartas físicas en la mano. Las cartas usan
//   `touch-action: none` (no `pan-y`, que tenían antes): con `pan-y` el
//   propio navegador se queda el gesto vertical como scroll nativo de la
//   página y JS nunca llega a ver el arrastre hacia arriba -- por eso no
//   funcionaba en el móvil.
'use client';

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { CardId } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { useRondaStore } from '@/lib/store';
import { pointsFor } from '@/lib/cardPoints';

export interface HandProps {
  hand: CardId[];
  bestMelds: CardId[][];
  lockedCardId: CardId | null;
  selected: CardId | null;
  /** Primer toque sobre una carta no seleccionada: la selecciona. */
  onSelect: (cardId: CardId) => void;
  /** Segundo toque sobre la carta ya seleccionada, o arrastrarla hacia la mesa: descarta (o cierra). */
  onCommit: (cardId: CardId) => void;
  myColorIndex: 0 | 1 | 2 | 3;
  jokerPoints: number;
}

// Fracción de cada carta que tapa la siguiente (0.35 = se ve un 65% de
// cada una salvo la primera). El ancho de carta se despeja de esa fracción
// y del ancho disponible: cardWidth = W / (1 + (N-1) * (1 - OVERLAP)).
const OVERLAP_FRACTION = 0.35;
const MIN_CARD_WIDTH = 48;
const MAX_CARD_WIDTH = 112;
const CARD_ASPECT = 108 / 72; // alto/ancho del viewBox de PlayingCard (2:3)
const TAP_THRESHOLD_PX = 6;
const DISCARD_DRAG_THRESHOLD_PX = 56;

interface DragState {
  cardId: CardId;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  startIndex: number;
  moved: boolean;
  discarding: boolean;
}

function meldedSet(bestMelds: CardId[][]): Set<CardId> {
  return new Set(bestMelds.flat());
}

export function Hand({
  hand,
  bestMelds,
  lockedCardId,
  selected,
  onSelect,
  onCommit,
  myColorIndex,
  jokerPoints,
}: HandProps) {
  const [order, setOrder] = useState<CardId[]>(hand);
  const [containerWidth, setContainerWidth] = useState(360);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<DragState | null>(null);
  const [draggingCardId, setDraggingCardId] = useState<CardId | null>(null);
  const [dragLift, setDragLift] = useState(0);

  // La mano solo la resincronizamos cuando cambia el *contenido* real que
  // manda el servidor (nueva carta robada, descartada...), no en cada
  // render: así un reordenamiento local a medio arrastre no se pisa solo.
  const handKey = hand.join('|');
  useEffect(() => {
    setOrder(hand);
  }, [handKey]);

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

  const melded = meldedSet(bestMelds);

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
      startIndex: index,
      moved: false,
      discarding: false,
    };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || e.pointerId !== drag.pointerId) return;
    e.preventDefault();

    const deltaX = e.clientX - drag.startClientX;
    const deltaY = e.clientY - drag.startClientY;
    if (Math.abs(deltaX) > TAP_THRESHOLD_PX || Math.abs(deltaY) > TAP_THRESHOLD_PX) drag.moved = true;

    // Arrastre hacia arriba, hacia la mesa: "lanza" la carta al descarte.
    // Prevalece sobre el reordenamiento horizontal en cuanto cruza el umbral.
    drag.discarding = deltaY < -DISCARD_DRAG_THRESHOLD_PX;
    setDraggingCardId(drag.cardId);
    setDragLift(drag.discarding ? deltaY : Math.min(0, deltaY / 3));

    if (drag.discarding) return;

    const currentIndex = order.indexOf(drag.cardId);
    if (currentIndex === -1) return;

    const shift = Math.round(deltaX / slot);
    const targetIndex = Math.min(Math.max(drag.startIndex + shift, 0), order.length - 1);
    if (targetIndex === currentIndex) return;

    const next = [...order];
    next.splice(currentIndex, 1);
    next.splice(targetIndex, 0, drag.cardId);
    setOrder(next);
    // El origen de referencia para el siguiente delta pasa a ser la
    // posición actual: así el arrastre se siente continuo en vez de dar
    // saltos cuando se mueve varias casillas seguidas.
    drag.startIndex = targetIndex;
    drag.startClientX = e.clientX;
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    dragState.current = null;
    setDraggingCardId(null);
    setDragLift(0);
    if (!drag || e.pointerId !== drag.pointerId) return;

    if (!drag.moved) {
      // Toque simple: la primera vez selecciona; si ya estaba seleccionada,
      // la segunda vez descarta (o cierra).
      if (drag.cardId === selected) onCommit(drag.cardId);
      else onSelect(drag.cardId);
      return;
    }

    if (drag.discarding) {
      onCommit(drag.cardId);
      return;
    }

    // El arrastre ya reordenó `order` en vivo; ahora se confirma al
    // servidor. `sortHand` no consume turno (contrato §2.6).
    void useRondaStore.getState().sendAction({ type: 'sortHand', order });
  }

  function handleAutoSort() {
    const grouped = bestMelds.flat();
    const loose = order.filter((id) => !melded.has(id));
    const next = [...grouped, ...loose];
    setOrder(next);
    void useRondaStore.getState().sendAction({ type: 'sortHand', order: next });
  }

  return (
    <div className="flex flex-col gap-2 border-t border-linea px-4 pb-4 pt-3">
      <div className="flex items-center justify-between">
        <h2 className="text-14 font-semibold text-hueso">Tu mano</h2>
        {/* Contrato §8.5.2 / P18: zona táctil mínima 56px -- se mantiene el
         * min-h-14 por defecto del Button (sin min-h-0), solo se recorta el
         * padding horizontal para que quepa junto al título "Tu mano". */}
        <Button variant="ghost" onClick={handleAutoSort} className="px-4 text-14">
          Ordenar
        </Button>
      </div>

      <div ref={containerRef} className="flex touch-pan-y items-end overflow-x-auto">
        {order.map((cardId, i) => {
          const isMelded = melded.has(cardId);
          const isLocked = cardId === lockedCardId;
          const isDragging = cardId === draggingCardId;
          return (
            <div
              key={cardId}
              onPointerDown={(e) => handlePointerDown(cardId, i, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
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
                <PlayingCard
                  cardId={cardId}
                  size="md"
                  selected={cardId === selected}
                  dimmed={!isMelded}
                  meldColor={isMelded ? myColorIndex : undefined}
                />
              </div>
              {!isMelded ? (
                <span className="font-mono text-12 text-humo">{pointsFor(cardId, jokerPoints)}</span>
              ) : null}
              {isLocked ? <Pill className="text-12">Bloqueada</Pill> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
