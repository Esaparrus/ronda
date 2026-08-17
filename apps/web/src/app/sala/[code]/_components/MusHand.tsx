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
  ochoReyes: boolean;
}

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

export function MusHand({
  hand,
  selectable,
  selected,
  onToggle,
  pares,
  juego,
  ochoReyes,
}: MusHandProps) {
  const marked = new Set(selected);
  const ordered = [...hand].sort((a, b) => sortKey(a) - sortKey(b));

  if (hand.length === 0) {
    return (
      <div className="game-hand flex min-h-20 shrink-0 flex-col items-center justify-center gap-1 px-3 py-2 text-center">
        <h2 className="text-12 font-semibold text-hueso">Esperando el reparto</h2>
        <p className="text-10 text-humo">El postre tiene que repartir cuatro cartas.</p>
      </div>
    );
  }

  return (
    <div className="game-hand flex shrink-0 flex-col gap-1.5 px-3 pb-2 pt-2">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-12 font-semibold text-hueso">Tu mano</h2>
        <p className="truncate font-mono text-10 text-humo">
          {pares
            ? `${PARES_LABEL[pares.kind]} (${pares.piedras})${ochoReyes ? ' · 8 reyes' : ''}`
            : 'Sin pares'}{' '}
          · {juego.tiene ? `Juego ${juego.suma}` : `Punto ${juego.suma}`}
        </p>
      </div>
      <div className="flex justify-center gap-[clamp(4px,1.5vw,8px)]">
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
              style={{ transform: isMarked ? 'translateY(-7px)' : undefined }}
              className={`flex flex-shrink-0 flex-col items-center rounded-xl transition-[transform,filter] disabled:cursor-default ${
                isMarked ? 'ring-2 ring-oro drop-shadow-lg' : ''
              }`}
            >
              <div className="aspect-[2/3] w-[clamp(56px,16.5vw,66px)] [&_svg]:h-full [&_svg]:w-full">
                <PlayingCard cardId={cardId} size="md" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
