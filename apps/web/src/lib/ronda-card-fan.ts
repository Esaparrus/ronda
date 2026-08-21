export interface RondaCardFanLayout {
  cardWidth: number;
  cardHeight: number;
  slotWidth: number;
  totalWidth: number;
  stageHeight: number;
}

const CARD_ASPECT = 3 / 2;
const MIN_CARD_WIDTH = 84;
const MAX_CARD_WIDTH = 112;
const VISIBLE_FRACTION = 0.62;
const FAN_VERTICAL_SPACE = 22;

/**
 * Calcula un abanico que siempre cabe completo en el ancho disponible.
 * Con pocas cartas conserva gran parte de cada cara visible; cuando la mano
 * crece hasta diez, aumenta el solape antes de reducir demasiado el naipe.
 */
export function rondaCardFanLayout(availableWidth: number, cardCount: number): RondaCardFanLayout {
  const width = Math.max(0, availableWidth);
  const count = Math.max(0, Math.floor(cardCount));

  if (count === 0 || width === 0) {
    return { cardWidth: 0, cardHeight: 0, slotWidth: 0, totalWidth: 0, stageHeight: 0 };
  }

  if (count === 1) {
    const cardWidth = Math.min(MAX_CARD_WIDTH, width);
    const cardHeight = cardWidth * CARD_ASPECT;
    return {
      cardWidth,
      cardHeight,
      slotWidth: 0,
      totalWidth: cardWidth,
      stageHeight: cardHeight + FAN_VERTICAL_SPACE,
    };
  }

  const fittedCardWidth = width / (1 + (count - 1) * VISIBLE_FRACTION);
  const cardWidth = Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, fittedCardWidth));
  const naturalSlotWidth = cardWidth * VISIBLE_FRACTION;
  const fittedSlotWidth = Math.max(0, (width - cardWidth) / (count - 1));
  const slotWidth = Math.min(naturalSlotWidth, fittedSlotWidth);
  const totalWidth = cardWidth + slotWidth * (count - 1);
  const cardHeight = cardWidth * CARD_ASPECT;

  return {
    cardWidth,
    cardHeight,
    slotWidth,
    totalWidth,
    stageHeight: cardHeight + FAN_VERTICAL_SPACE,
  };
}

export function rondaCardFanTransform(index: number, cardCount: number, selected: boolean): string {
  if (selected || cardCount <= 1) return 'rotate(0deg)';

  const middle = (cardCount - 1) / 2;
  const normalized = middle === 0 ? 0 : (index - middle) / middle;
  const maxRotation = cardCount <= 5 ? 4 : 3;
  return `rotate(${(normalized * maxRotation).toFixed(2)}deg)`;
}

export function rondaCardFanTop(index: number, cardCount: number, selected: boolean): number {
  if (selected || cardCount <= 1) return 0;

  const middle = (cardCount - 1) / 2;
  const normalized = middle === 0 ? 0 : Math.abs((index - middle) / middle);
  return 12 + normalized * 6;
}
