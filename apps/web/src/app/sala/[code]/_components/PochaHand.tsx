// Mano de Pocha: tercio inferior de la pantalla de partida, más simple que
// la de Chinchón (Hand.tsx) -- Pocha no tiene combinaciones ni `sortHand`
// en el motor (§10.4), así que no hace falta arrastre ni reordenamiento
// manual. Orden de visualización fijo por palo+rango (ayuda a ver de un
// vistazo con qué se puede asistir). Tocar una carta legal juega directo:
// una sola acción posible, a diferencia de Chinchón no hace falta un
// segundo toque de confirmación.
'use client';

import { SUITS, parseCardId, type CardId } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';

export interface PochaHandProps {
  hand: CardId[];
  /** Cartas jugables ahora mismo (obligación de asistir ya resuelta por el servidor). */
  legalCardIds: CardId[];
  /** Si es mi turno de baza: tocar una carta legal la juega. */
  canPlay: boolean;
  onPlay: (cardId: CardId) => void;
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

export function PochaHand({ hand, legalCardIds, canPlay, onPlay }: PochaHandProps) {
  const legal = new Set(legalCardIds);
  const ordered = [...hand].sort((a, b) => sortKey(a) - sortKey(b));
  const n = Math.max(ordered.length, 1);
  const rawWidth = 360 / (1 + (n - 1) * (1 - OVERLAP_FRACTION));
  const cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, rawWidth));
  const slot = cardWidth * (1 - OVERLAP_FRACTION);

  return (
    <div className="flex flex-col gap-2 border-t border-linea px-4 pb-4 pt-3">
      <h2 className="text-14 font-semibold text-hueso">Tu mano</h2>
      <div className="flex touch-pan-y items-end overflow-x-auto">
        {ordered.map((cardId, i) => {
          const isLegal = canPlay && legal.has(cardId);
          return (
            <button
              key={cardId}
              type="button"
              disabled={!isLegal}
              onClick={() => onPlay(cardId)}
              style={{ marginLeft: i === 0 ? 0 : -(cardWidth - slot) }}
              className="relative flex flex-shrink-0 flex-col items-center disabled:cursor-default"
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
    </div>
  );
}
