import type { CardId } from '@ronda/protocol';
import { PlayingCard } from './PlayingCard';

export function MiniCardFan({ cards }: { cards: readonly CardId[] }) {
  if (cards.length === 0) return <span className="text-11 text-humo">Mano oculta</span>;
  return (
    <div className="mini-card-fan" aria-label={`${cards.length} cartas reveladas`}>
      {cards.map((cardId, index) => (
        <span key={cardId} className="mini-card-fan__card" style={{ zIndex: index + 1 }}>
          <PlayingCard cardId={cardId} size="sm" />
        </span>
      ))}
    </div>
  );
}
