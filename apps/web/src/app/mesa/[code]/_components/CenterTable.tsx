// Centro del anillo: mazo y descarte. La pantalla central muestra las tres
// últimas cartas públicas solapadas para que número y palo sigan siendo
// legibles a distancia y el origen de cada robo resulte evidente.
import type { CardId } from '@ronda/protocol';
import { Pile } from '@/components/cards/Pile';
import { Pill } from '@/components/ui/Pill';

export interface CenterTableProps {
  deckCount: number;
  discardCards: CardId[];
  discardCount: number;
}

const MAX_VISUAL_DECK_STACK = 5;

export function CenterTable({ deckCount, discardCards, discardCount }: CenterTableProps) {
  const deckPlaceholders: CardId[] = Array.from(
    { length: Math.min(deckCount, MAX_VISUAL_DECK_STACK) },
    (_, index) => `deck-${index}`,
  );

  return (
    <div className="flex items-center gap-[clamp(1.5rem,6vw,4rem)]">
      <div className="flex flex-col items-center gap-2">
        <Pile cards={deckPlaceholders} faceDown size="lg" />
        <Pill className="text-[clamp(0.9rem,1.4vw,1.15rem)]">
          <span className="sm:hidden">{deckCount}</span>
          <span className="hidden sm:inline">{deckCount} cartas</span>
        </Pill>
      </div>

      <div className="flex flex-col items-center gap-2">
        <Pile
          cards={discardCards}
          size="lg"
          layout="discard"
          totalCount={discardCount}
        />
        <Pill className="text-[clamp(0.9rem,1.4vw,1.15rem)]">
          <span className="sm:hidden">{discardCount}</span>
          <span className="hidden sm:inline">{discardCount} en el descarte</span>
        </Pill>
      </div>
    </div>
  );
}
