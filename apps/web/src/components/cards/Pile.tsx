// Montón de cartas apiladas (mazo de robo o descarte). Contrato P11.
//
// La rotación de cada carta es puramente cosmética y se deriva de forma
// determinista del CardId. El modo `discard` limita la vista a las dos cartas
// superiores y desplaza la primera para dejar visibles su número y su palo.
import React from 'react';
import { parseCardId, type CardId, type Suit } from '@ronda/protocol';
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
  /** Enseña la carta superior y una franja legible de la anterior. */
  layout?: 'stack' | 'discard';
  className?: string;
}

const SIZE_PX: Record<CardSize, { width: number; height: number }> = {
  sm: { width: 48, height: 72 },
  md: { width: 72, height: 108 },
  lg: { width: 120, height: 180 },
};

const DISCARD_REVEAL_PX: Record<CardSize, number> = {
  sm: 16,
  md: 24,
  lg: 40,
};

const MAX_VISIBLE_DISCARDS = 2;

const SUIT_INITIAL: Record<Suit, string> = {
  oros: 'O',
  copas: 'C',
  espadas: 'E',
  bastos: 'B',
};

const SUIT_COLOR: Record<Suit, string> = {
  oros: 'var(--card-oros)',
  copas: 'var(--card-copas)',
  espadas: 'var(--card-espadas)',
  bastos: 'var(--card-bastos)',
};

const PEEK_SIZE: Record<CardSize, { font: number; inset: number; width: number }> = {
  sm: { font: 7, inset: 2, width: 12 },
  md: { font: 10, inset: 3, width: 18 },
  lg: { font: 15, inset: 5, width: 28 },
};

/** Montón de cartas con apilado compacto o solape legible de descarte. */
export function Pile({
  cards,
  size = 'md',
  faceDown = false,
  layout = 'stack',
  className,
}: PileProps) {
  const { width, height } = SIZE_PX[size];
  const discardReveal = layout === 'discard' ? DISCARD_REVEAL_PX[size] : 0;
  const pileWidth = width + discardReveal;
  const visibleCards = layout === 'discard' ? cards.slice(-MAX_VISIBLE_DISCARDS) : cards;

  if (visibleCards.length === 0) {
    return (
      <div
        className={className}
        style={{ position: 'relative', width: pileWidth, height }}
        role="img"
        aria-label="Montón vacío"
      >
        <div
          style={{
            position: 'absolute',
            insetBlock: 0,
            left: discardReveal,
            width,
            borderRadius: 8,
            border: '1.5px dashed var(--color-linea)',
          }}
        />
      </div>
    );
  }

  return (
    <div className={className} style={{ position: 'relative', width: pileWidth, height }}>
      {visibleCards.map((cardId, index) => {
        const discardSlot = MAX_VISIBLE_DISCARDS - visibleCards.length + index;
        const isTopCard = index === visibleCards.length - 1;
        const rotation = layout === 'discard' ? rotationFor(cardId) / 4 : rotationFor(cardId);
        const transform =
          layout === 'discard'
            ? `translateX(${discardSlot * discardReveal}px) rotate(${rotation}deg)`
            : `rotate(${rotation}deg)`;
        const parsedCard = parseCardId(cardId);
        const peekCard =
          layout === 'discard' && !isTopCard && parsedCard.ok ? parsedCard.value : null;
        const peekSize = PEEK_SIZE[size];

        return (
          <div
            key={cardId}
            data-pile-card={cardId}
            data-pile-position={isTopCard ? 'top' : 'under'}
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: index,
              transform,
              transition: 'transform 180ms ease-out',
            }}
          >
            <div
              style={{
                animation:
                  layout === 'discard' && isTopCard
                    ? 'discard-fling 180ms ease-out'
                    : undefined,
              }}
            >
              <PlayingCard cardId={cardId} size={size} faceDown={faceDown} />
            </div>
            {peekCard ? (
              <span
                data-discard-peek={cardId}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  zIndex: 1,
                  top: peekSize.inset,
                  left: peekSize.inset,
                  display: 'flex',
                  width: peekSize.width,
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  paddingBlock: 2,
                  border: `1px solid ${SUIT_COLOR[peekCard.suit]}`,
                  borderRadius: 4,
                  background: 'var(--color-crema)',
                  boxShadow: '0 1px 2px rgb(0 0 0 / 0.28)',
                  color: 'var(--color-tinta)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: peekSize.font,
                  fontWeight: 700,
                  lineHeight: 0.9,
                }}
              >
                <span>{peekCard.rank}</span>
                <span style={{ color: SUIT_COLOR[peekCard.suit] }}>
                  {SUIT_INITIAL[peekCard.suit]}
                </span>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
