import { parseCardId, rankPosition, type CardId, type Suit } from '@ronda/protocol';

/** Valor de baza compartido por Brisca y Tute. */
export function trickPoints(cardId: CardId): number {
  const parsed = parseCardId(cardId);
  if (!parsed.ok) return 0;
  const rank = parsed.value.rank;
  if (rank === 1) return 11;
  if (rank === 3) return 10;
  if (rank === 12) return 4;
  if (rank === 11) return 3;
  if (rank === 10) return 2;
  return 0;
}

/** Valor de captura de Escoba: sota 8, caballo 9 y rey 10. */
export function escobaValue(cardId: CardId): number {
  const parsed = parseCardId(cardId);
  if (!parsed.ok) return 0;
  const rank = parsed.value.rank;
  return rank <= 7 ? rank : rank - 2;
}

/** Valor en Siete y media. Se conserva como número porque solo usa medios. */
export function sevenHalfValue(cardId: CardId): number {
  const parsed = parseCardId(cardId);
  if (!parsed.ok) return 0;
  return parsed.value.rank <= 7 ? parsed.value.rank : 0.5;
}

export function sevenHalfTotal(cards: readonly CardId[]): number {
  return cards.reduce((total, cardId) => total + sevenHalfValue(cardId), 0);
}

/** Cartas legales del Cinquillo para el estado público actual de la mesa. */
export function cinquilloLegal(hand: readonly CardId[], tableCards: readonly CardId[]): CardId[] {
  const fiveOfOrosPlayed = tableCards.includes('oros-5');
  if (!fiveOfOrosPlayed) return hand.filter((cardId) => cardId === 'oros-5');

  const bySuit = new Map<Suit, number[]>();
  for (const id of tableCards) {
    const parsed = parseCardId(id);
    if (!parsed.ok) continue;
    const positions = bySuit.get(parsed.value.suit) ?? [];
    positions.push(rankPosition(parsed.value.rank));
    bySuit.set(parsed.value.suit, positions);
  }

  return hand.filter((id) => {
    const parsed = parseCardId(id);
    if (!parsed.ok) return false;
    const position = rankPosition(parsed.value.rank);
    const positions = bySuit.get(parsed.value.suit) ?? [];
    if (positions.length === 0) return position === 5;
    return position === Math.min(...positions) - 1 || position === Math.max(...positions) + 1;
  });
}
