import type { CSSProperties } from 'react';
import type { PartyPlayedNumber, PlayerId } from '@ronda/protocol';
import { NumberCardFace } from './NumberCardFace';

type NumberGridDensity = 'roomy' | 'regular' | 'dense' | 'packed' | 'maximum';

function numberGridLayout(count: number, variant: 'compact' | 'large') {
  if (variant === 'large') {
    if (count <= 8) return { columns: Math.max(count, 1), density: 'roomy' as const };
    if (count <= 16) return { columns: 8, density: 'regular' as const };
    if (count <= 30) return { columns: 10, density: 'dense' as const };
    if (count <= 48) return { columns: 12, density: 'packed' as const };
    return { columns: 14, density: 'maximum' as const };
  }

  if (count <= 6) return { columns: Math.max(count, 1), density: 'roomy' as const };
  if (count <= 12) return { columns: 6, density: 'regular' as const };
  if (count <= 24) return { columns: 8, density: 'dense' as const };
  if (count <= 40) return { columns: 8, density: 'packed' as const };
  return { columns: 10, density: 'maximum' as const };
}

export interface NumberTableGridProps {
  cards: readonly PartyPlayedNumber[];
  failure?: { playerId: PlayerId; value: number } | null;
  variant?: 'compact' | 'large';
  emptyLabel?: string;
}

/** La mesa de Orden crece de una carta a setenta sin desbordar la pantalla. */
export function NumberTableGrid({
  cards,
  failure = null,
  variant = 'compact',
  emptyLabel = 'Aún no hay cartas',
}: NumberTableGridProps) {
  if (cards.length === 0) return <span className="text-16 text-humo">{emptyLabel}</span>;

  const { columns, density }: { columns: number; density: NumberGridDensity } = numberGridLayout(
    cards.length,
    variant,
  );
  const style = { '--number-table-columns': columns } as CSSProperties;

  return (
    <div
      className={`number-table-grid number-table-grid--${variant} number-table-grid--${density}`}
      style={style}
      data-card-count={cards.length}
    >
      {cards.map((played, index) => (
        <NumberCardFace
          key={`${played.playerId}-${played.value}-${index}`}
          value={played.value}
          className={
            failure?.value === played.value && failure.playerId === played.playerId
              ? 'number-card-adaptive number-card-failed'
              : 'number-card-adaptive'
          }
        />
      ))}
    </div>
  );
}
