// Mano revelada al final de ronda: combinaciones reales agrupadas + cartas
// sueltas con sus puntos. Contrato P16 ("combinaciones reveladas -cartas
// reales, agrupadas-, cartas sueltas con sus puntos"). Compartido entre
// RoundEndScreen/GameEndScreen de /sala y /mesa: los números vienen tal
// cual de `RoundResultRow` (melds/leftovers), nunca recalculados aquí.
import type { CardId } from '@ronda/protocol';
import { PlayingCard, type CardSize } from './PlayingCard';
import { Pill } from '@/components/ui/Pill';
import { pointsFor } from '@/lib/cardPoints';

export interface RevealedHandProps {
  melds: CardId[][];
  leftovers: CardId[];
  jokerPoints: number;
  size?: CardSize;
  className?: string;
}

const OVERLAP_PX: Record<CardSize, number> = { sm: 16, md: 24, lg: 40 };

export function RevealedHand({
  melds,
  leftovers,
  jokerPoints,
  size = 'sm',
  className = '',
}: RevealedHandProps) {
  const overlap = OVERLAP_PX[size];

  return (
    <div className={`flex flex-wrap items-start gap-3 ${className}`}>
      {melds.map((meld, i) => (
        <div key={i} className="flex items-center rounded-md border border-linea bg-tinta/40 p-1.5">
          {meld.map((cardId, j) => (
            <div key={cardId} style={{ marginLeft: j === 0 ? 0 : -overlap }}>
              <PlayingCard cardId={cardId} size={size} />
            </div>
          ))}
        </div>
      ))}

      {leftovers.length > 0 ? (
        <div className="flex flex-wrap items-start gap-2">
          {leftovers.map((cardId) => (
            <div key={cardId} className="flex flex-col items-center gap-1">
              <PlayingCard cardId={cardId} size={size} dimmed />
              <Pill className="text-12">{pointsFor(cardId, jokerPoints)}</Pill>
            </div>
          ))}
        </div>
      ) : null}

      {melds.length === 0 && leftovers.length === 0 ? (
        <span className="text-14 text-humo">Sin cartas reveladas.</span>
      ) : null}
    </div>
  );
}
