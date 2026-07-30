// Mano del jugador: tercio inferior de la pantalla de partida. Contrato P14.
//
// - Abanico ligero con solape (margin negativo) para que quepan 8 cartas
//   (mano de 7 + una recién robada) sin scroll a 375px de ancho; el scroll
//   horizontal se deja puesto como red de seguridad, tal cual pide el
//   contrato literalmente ("scroll horizontal si no caben"), pero con el
//   solape no debería activarse nunca en el ancho mínimo soportado.
// - Toque para seleccionar. Arrastrar para reordenar: arrastre a mano con
//   eventos de puntero (Pointer Events), sin librerías de drag-and-drop
//   (prohibido explícitamente por el contrato P14).
// - "Ordenar" agrupa por `me.bestMelds` (sugerencia del servidor) + deja las
//   cartas sueltas al final, y llama a `sendAction({type:'sortHand', ...})`.
//   `sortHand` no consume turno (contrato §2.6): se puede llamar en
//   cualquier momento, no solo en el propio turno.
// - Ninguna regla de juego se calcula aquí: solo se reordena localmente lo
//   que ya llegó en `hand`/`bestMelds`/`deadwood` del servidor, y se
//   reenvía la intención. La "carta bloqueada" (`lockedCardId`, la robada
//   del descarte que no se puede volver a descartar) se marca solo como
//   información -no impide seleccionarla-, para no meter lógica de reglas
//   en el cliente: si el jugador insiste, el servidor la rechazará.
'use client';

import { useEffect, useRef, useState } from 'react';
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
  onSelect: (cardId: CardId) => void;
  myColorIndex: 0 | 1 | 2 | 3;
  jokerPoints: number;
}

const CARD_WIDTH = 48;
const SLOT_WIDTH = 32; // solape: 48 - 16px de margen negativo entre cartas
const TAP_THRESHOLD_PX = 6;

function meldedSet(bestMelds: CardId[][]): Set<CardId> {
  return new Set(bestMelds.flat());
}

export function Hand({
  hand,
  bestMelds,
  lockedCardId,
  selected,
  onSelect,
  myColorIndex,
  jokerPoints,
}: HandProps) {
  const [order, setOrder] = useState<CardId[]>(hand);
  const dragState = useRef<{
    cardId: CardId;
    pointerId: number;
    startClientX: number;
    startIndex: number;
    moved: boolean;
  } | null>(null);

  // La mano solo la resincronizamos cuando cambia el *contenido* real que
  // manda el servidor (nueva carta robada, descartada...), no en cada
  // render: así un reordenamiento local a medio arrastre no se pisa solo.
  const handKey = hand.join('|');
  useEffect(() => {
    setOrder(hand);
    // Dependencia deliberada en `handKey` (derivada de `hand`) y no en
    // `hand` misma: así solo se resincroniza cuando el *contenido* cambia,
    // no en cada render con una nueva identidad de array pero mismo
    // contenido.
  }, [handKey]);

  const melded = meldedSet(bestMelds);

  function handlePointerDown(cardId: CardId, index: number, e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      cardId,
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startIndex: index,
      moved: false,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    if (!drag || e.pointerId !== drag.pointerId) return;

    const deltaX = e.clientX - drag.startClientX;
    if (Math.abs(deltaX) > TAP_THRESHOLD_PX) drag.moved = true;

    const currentIndex = order.indexOf(drag.cardId);
    if (currentIndex === -1) return;

    const shift = Math.round(deltaX / SLOT_WIDTH);
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

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragState.current;
    dragState.current = null;
    if (!drag || e.pointerId !== drag.pointerId) return;

    if (!drag.moved) {
      onSelect(drag.cardId);
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
        <Button variant="ghost" onClick={handleAutoSort} className="min-h-0 px-4 py-2 text-14">
          Ordenar
        </Button>
      </div>

      <div className="flex touch-pan-y items-end overflow-x-auto">
        {order.map((cardId, i) => {
          const isMelded = melded.has(cardId);
          const isLocked = cardId === lockedCardId;
          return (
            <div
              key={cardId}
              onPointerDown={(e) => handlePointerDown(cardId, i, e)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{
                marginLeft: i === 0 ? 0 : -(CARD_WIDTH - SLOT_WIDTH),
                touchAction: 'pan-y',
              }}
              className="relative flex flex-shrink-0 flex-col items-center gap-1"
            >
              <PlayingCard
                cardId={cardId}
                size="sm"
                selected={cardId === selected}
                dimmed={!isMelded}
                meldColor={isMelded ? myColorIndex : undefined}
              />
              {!isMelded ? (
                <span className="font-mono text-12 text-humo">
                  {pointsFor(cardId, jokerPoints)}
                </span>
              ) : null}
              {isLocked ? <Pill className="text-12">Bloqueada</Pill> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
