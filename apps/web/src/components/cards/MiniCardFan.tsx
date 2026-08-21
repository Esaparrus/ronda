import type { CardId } from '@ronda/protocol';
import { PlayingCard } from './PlayingCard';

export function MiniCardFan({
  cards,
  overlap = true,
}: {
  cards: readonly CardId[];
  overlap?: boolean;
}) {
  if (cards.length === 0) return <span className="text-11 text-humo">Mano oculta</span>;
  return (
    <div
      className={`mini-card-fan ${overlap ? '' : 'mini-card-fan--flat'}`}
      aria-label={`${cards.length} cartas reveladas`}
    >
      {cards.map((cardId, index) => (
        <span key={cardId} className="mini-card-fan__card" style={{ zIndex: index + 1 }}>
          <PlayingCard cardId={cardId} size="sm" />
        </span>
      ))}
    </div>
  );
}
