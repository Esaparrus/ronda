// Montón de cartas apiladas (mazo de robo o descarte). Contrato P11.
//
// En el descarte se conservan hasta tres cartas públicas. Cada una recibe
// una postura a partir de su índice absoluto en el montón: si se roba la
// superior, las cartas que ya estaban debajo no cambian de posición ni giro.
import React from 'react';
import type { CardId } from '@ronda/protocol';
import { PlayingCard, type CardSize } from './PlayingCard';

function hashCode(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return hash;
}

/** Grados de rotación determinista en [-10, 10] a partir del id de carta. */
function rotationFor(cardId: CardId): number {
  return (Math.abs(hashCode(cardId)) % 21) - 10;
}

export interface PileProps {
  /** Cartas del montón, de abajo a arriba: la última es la carta superior. */
  cards: CardId[];
  size?: CardSize;
  /** Muestra todas las cartas boca abajo, como en el mazo de robo. */
  faceDown?: boolean;
  /** Enseña la superior y hasta dos cartas anteriores en un montón natural. */
  layout?: 'stack' | 'discard';
  /** Recuento completo, necesario para mantener estable la postura al robar. */
  totalCount?: number;
  className?: string;
}

const SIZE_PX: Record<CardSize, { width: number; height: number }> = {
  sm: { width: 48, height: 72 },
  md: { width: 72, height: 108 },
  lg: { width: 120, height: 180 },
};

const DISCARD_SPREAD_PX: Record<CardSize, { x: number; y: number }> = {
  sm: { x: 15, y: 8 },
  md: { x: 23, y: 12 },
  lg: { x: 38, y: 20 },
};

const DISCARD_POSES = [
  { x: 0.08, y: 0.42, rotation: -5.4 },
  { x: 0.52, y: 0.06, rotation: 3.7 },
  { x: 0.94, y: 0.54, rotation: -1.8 },
  { x: 0.24, y: 0.9, rotation: 4.8 },
  { x: 0.72, y: 0.28, rotation: -3.5 },
] as const;

const MAX_VISIBLE_DISCARDS = 3;

function discardTransformFor(
  cardId: CardId,
  discardIndex: number,
  size: CardSize,
): string {
  const pose = DISCARD_POSES[discardIndex % DISCARD_POSES.length] ?? DISCARD_POSES[0];
  const spread = DISCARD_SPREAD_PX[size];
  const x = Math.round(pose.x * spread.x);
  const y = Math.round(pose.y * spread.y);
  const rotation = pose.rotation + rotationFor(cardId) / 20;

  return `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
}

function EmptyPile({
  className,
  height,
  left = 0,
  top = 0,
  width,
}: {
  className?: string;
  height: number;
  left?: number;
  top?: number;
  width: number;
}) {
  return (
    <div
      className={className}
      style={{ position: 'relative', width: width + left * 2, height: height + top * 2 }}
      role="img"
      aria-label="Montón vacío"
    >
      <div
        style={{
          position: 'absolute',
          top,
          left,
          width,
          height,
          borderRadius: 8,
          border: '1.5px dashed var(--color-linea)',
        }}
      />
    </div>
  );
}

/** Montón compacto de mazo o descarte natural con posturas persistentes. */
export function Pile({
  cards,
  size = 'md',
  faceDown = false,
  layout = 'stack',
  totalCount,
  className,
}: PileProps) {
  const { width, height } = SIZE_PX[size];

  if (layout === 'stack') {
    if (cards.length === 0) {
      return <EmptyPile className={className} width={width} height={height} />;
    }

    return (
      <div className={className} style={{ position: 'relative', width, height }}>
        {cards.map((cardId, index) => (
          <div
            key={cardId}
            data-pile-card={cardId}
            data-pile-position={index === cards.length - 1 ? 'top' : 'under'}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: index,
              transform: `rotate(${rotationFor(cardId)}deg)`,
            }}
          >
            <PlayingCard cardId={cardId} size={size} faceDown={faceDown} />
          </div>
        ))}
      </div>
    );
  }

  const spread = DISCARD_SPREAD_PX[size];
  const pileWidth = width + spread.x;
  const pileHeight = height + spread.y;
  const visibleCards = cards.slice(-MAX_VISIBLE_DISCARDS);

  if (visibleCards.length === 0) {
    return (
      <EmptyPile
        className={className}
        width={width}
        height={height}
        left={spread.x / 2}
        top={spread.y / 2}
      />
    );
  }

  const resolvedTotalCount = Math.max(totalCount ?? cards.length, visibleCards.length);
  const firstDiscardIndex = resolvedTotalCount - visibleCards.length;

  return (
    <div className={className} style={{ position: 'relative', width: pileWidth, height: pileHeight }}>
      {visibleCards.map((cardId, index) => {
        const discardIndex = firstDiscardIndex + index;
        const isTopCard = index === visibleCards.length - 1;
        const transform = discardTransformFor(cardId, discardIndex, size);

        return (
          <div
            key={cardId}
            data-pile-card={cardId}
            data-pile-position={isTopCard ? 'top' : 'under'}
            data-discard-index={discardIndex}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              zIndex: index,
              transform,
              transformOrigin: 'center',
            }}
          >
            <div style={{ animation: 'discard-fling 220ms cubic-bezier(.22,.8,.3,1)' }}>
              <PlayingCard cardId={cardId} size={size} faceDown={faceDown} />
            </div>
          </div>
        );
      })}

    </div>
  );
}
