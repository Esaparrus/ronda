import { parseCardId, SUITS, type CardId } from '@ronda/protocol';
import { PlayingCard } from './PlayingCard';

const CINQUILLO_RANKS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;

const SUIT_LABELS = {
  oros: 'Oros',
  copas: 'Copas',
  espadas: 'Espadas',
  bastos: 'Bastos',
} as const;

export interface CinquilloTableProps {
  cards: readonly CardId[];
  variant?: 'compact' | 'large';
}

/** Cuatro calles estables: cada carta conserva su lugar aunque falten rangos. */
export function CinquilloTable({ cards, variant = 'compact' }: CinquilloTableProps) {
  const bySlot = new Map<string, CardId>();
  for (const cardId of cards) {
    const parsed = parseCardId(cardId);
    if (parsed.ok) bySlot.set(`${parsed.value.suit}-${parsed.value.rank}`, cardId);
  }

  return (
    <div className={`cinquillo-table cinquillo-table--${variant}`}>
      {SUITS.map((suit) => (
        <section key={suit} className="cinquillo-table__row" aria-label={SUIT_LABELS[suit]}>
          <span className="cinquillo-table__suit">{SUIT_LABELS[suit]}</span>
          <div className="cinquillo-table__rail">
            {CINQUILLO_RANKS.map((rank, index) => {
              const cardId = bySlot.get(`${suit}-${rank}`);
              return (
                <span
                  key={rank}
                  className="cinquillo-table__slot"
                  style={{ zIndex: index + 1 }}
                  aria-hidden={cardId ? undefined : true}
                >
                  {cardId ? <PlayingCard cardId={cardId} size="sm" /> : null}
                </span>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
