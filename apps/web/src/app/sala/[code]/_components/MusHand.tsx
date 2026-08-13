// Mano de Mus: cuatro cartas, siempre las mismas cuatro hasta que se
// descarta. Más simple que la de Pocha (PochaHand.tsx) porque aquí no se
// juegan cartas nunca: solo se seleccionan para el descarte de §12.5.
//
// Debajo van los pares y el juego de tu mano, que llegan calculados del
// servidor (`me.pares`, `me.juego`). Es información PRIVADA y por eso vive
// aquí y no en la mesa: nadie más la ve hasta el recuento.
'use client';

import { SUITS, parseCardId, type CardId, type MusPlayerViewMe } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';

export interface MusHandProps {
  hand: CardId[];
  /** Fase de descarte: se pueden marcar cartas (§12.5). */
  selectable: boolean;
  selected: CardId[];
  onToggle: (cardId: CardId) => void;
  pares: MusPlayerViewMe['pares'];
  juego: MusPlayerViewMe['juego'];
}

const CARD_WIDTH = 76;
const CARD_ASPECT = 108 / 72;

const PARES_LABEL: Record<'duples' | 'medias' | 'pareja', string> = {
  duples: 'Duples',
  medias: 'Medias',
  pareja: 'Pareja',
};

function sortKey(id: CardId): number {
  const parsed = parseCardId(id);
  if (!parsed.ok || parsed.value.suit === null || parsed.value.rank === null) return 0;
  const suitIndex = SUITS.indexOf(parsed.value.suit);
  return suitIndex * 100 + parsed.value.rank;
}

export function MusHand({ hand, selectable, selected, onToggle, pares, juego }: MusHandProps) {
  const marked = new Set(selected);
  const ordered = [...hand].sort((a, b) => sortKey(a) - sortKey(b));

  return (
    <div className="game-hand flex flex-col gap-2 px-4 pb-4 pt-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-14 font-semibold text-hueso">Tu mano</h2>
        <p className="font-mono text-12 text-humo">
          {pares ? `${PARES_LABEL[pares.kind]} (${pares.piedras})` : 'Sin pares'} ·{' '}
          {juego.tiene ? `Juego ${juego.suma}` : `Punto ${juego.suma}`}
        </p>
      </div>
      <div className="flex justify-center gap-2">
        {ordered.map((cardId) => {
          const isMarked = marked.has(cardId);
          return (
            <button
              key={cardId}
              type="button"
              disabled={!selectable}
              aria-pressed={isMarked}
              aria-label={isMarked ? 'Quitar del descarte' : 'Descartar esta carta'}
              onClick={() => onToggle(cardId)}
              style={{ transform: isMarked ? 'translateY(-10px)' : undefined }}
              className={`flex flex-shrink-0 flex-col items-center rounded-xl transition-[transform,filter] disabled:cursor-default ${
                isMarked ? 'ring-2 ring-oro drop-shadow-lg' : ''
              }`}
            >
              <div
                className="[&_svg]:h-full [&_svg]:w-full"
                style={{ width: CARD_WIDTH, height: CARD_WIDTH * CARD_ASPECT }}
              >
                <PlayingCard cardId={cardId} size="md" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
