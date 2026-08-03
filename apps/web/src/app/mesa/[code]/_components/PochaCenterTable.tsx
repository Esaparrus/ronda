// Centro del anillo para Pocha: triunfo + cartas jugadas en la baza en
// curso. Mismo patrón de escalado clamp() que CenterTable.tsx (Chinchón).
// Vista siempre TableView: nunca lee `me`.
import type { CardId } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { Pill } from '@/components/ui/Pill';

export interface PochaCenterTableProps {
  trumpCardId: CardId | null;
  currentTrick: { cardId: CardId }[];
}

export function PochaCenterTable({ trumpCardId, currentTrick }: PochaCenterTableProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-[clamp(1rem,4vw,2.5rem)]">
      {trumpCardId ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-[clamp(64px,9vw,120px)] [&_svg]:h-full [&_svg]:w-full">
            <PlayingCard cardId={trumpCardId} size="lg" />
          </div>
          <Pill className="text-[clamp(0.9rem,1.4vw,1.15rem)]">Triunfo</Pill>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        {currentTrick.map((t, i) => (
          <div key={`${t.cardId}-${i}`} className="w-[clamp(56px,7vw,100px)] [&_svg]:h-full [&_svg]:w-full">
            <PlayingCard cardId={t.cardId} size="md" />
          </div>
        ))}
      </div>
    </div>
  );
}
