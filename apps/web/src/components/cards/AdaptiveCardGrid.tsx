import type { CSSProperties, ReactNode } from 'react';

export type CardGridDensity = 'roomy' | 'regular' | 'dense' | 'packed';

export interface CardGridLayout {
  columns: number;
  rows: number;
  density: CardGridDensity;
}

/**
 * Reparte cartas de mesa sin scroll. Los saltos corresponden a los casos
 * reales de Escoba: una salida corta, una mesa concurrida y el peor caso de
 * las 40 cartas todavía visibles.
 */
export function cardGridLayout(cardCount: number): CardGridLayout {
  const count = Math.max(0, Math.floor(cardCount));
  if (count <= 4) return { columns: Math.max(count, 1), rows: 1, density: 'roomy' };
  if (count <= 8) return { columns: 4, rows: 2, density: 'regular' };
  if (count <= 12) return { columns: 6, rows: 2, density: 'regular' };
  if (count <= 18) return { columns: 6, rows: 3, density: 'dense' };
  if (count <= 24) return { columns: 6, rows: 4, density: 'dense' };
  if (count <= 32) return { columns: 8, rows: 4, density: 'packed' };
  return { columns: 8, rows: Math.ceil(count / 8), density: 'packed' };
}

export interface AdaptiveCardGridProps {
  cardCount: number;
  children: ReactNode;
  variant?: 'compact' | 'large';
  className?: string;
  emptyLabel?: string;
}

export function AdaptiveCardGrid({
  cardCount,
  children,
  variant = 'compact',
  className = '',
  emptyLabel = 'No hay cartas en la mesa',
}: AdaptiveCardGridProps) {
  const layout = cardGridLayout(cardCount);
  const style = {
    '--table-card-columns': layout.columns,
    '--table-card-rows': layout.rows,
  } as CSSProperties;

  if (cardCount === 0) {
    return <p className="text-center text-14 text-humo">{emptyLabel}</p>;
  }

  return (
    <div
      className={`adaptive-card-grid adaptive-card-grid--${variant} adaptive-card-grid--${layout.density} ${className}`}
      style={style}
      data-card-count={cardCount}
    >
      {children}
    </div>
  );
}
