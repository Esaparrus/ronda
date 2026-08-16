import { buildDeck } from '@ronda/engine';
import { parseCardId, type CardId, type Rank, type Suit } from '@ronda/protocol';

/** Baraja canónica de 40 cartas. Se comparte entre todas las estrategias. */
export const ALL_CARD_IDS: readonly CardId[] = buildDeck().map((card) => card.id);

/** Hash estable: aporta variedad sin Math.random ni información oculta. */
export function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Escoge casi siempre la mejor opción, pero alterna entre opciones de calidad
 * prácticamente equivalente. Así el bot no repite una secuencia robótica ni
 * convierte una heurística fuerte en un rival matemáticamente perfecto.
 */
export function chooseNearBest<T>(
  ranked: readonly { value: T; score: number }[],
  signature: string,
  tolerance: number,
): T | null {
  const first = ranked[0];
  if (!first) return null;
  const close = ranked.filter((candidate) => candidate.score <= first.score + tolerance);
  if (close.length === 1 || stableHash(signature) % 100 >= 9) return first.value;
  const alternative = 1 + (stableHash(`${signature}:alternative`) % (close.length - 1));
  return close[alternative]?.value ?? first.value;
}

export interface ParsedBotCard {
  id: CardId;
  suit: Suit;
  rank: Rank;
  points: number;
}

export function botCard(cardId: CardId): ParsedBotCard | null {
  const parsed = parseCardId(cardId);
  if (!parsed.ok) return null;
  return parsed.value;
}

export function cardsNotKnown(known: ReadonlySet<CardId>): CardId[] {
  return ALL_CARD_IDS.filter((cardId) => !known.has(cardId));
}

export function combinations<T>(items: readonly T[], choose: number): T[][] {
  if (choose === 0) return [[]];
  if (choose < 0 || choose > items.length) return [];
  const result: T[][] = [];
  function visit(start: number, picked: T[]): void {
    if (picked.length === choose) {
      result.push([...picked]);
      return;
    }
    const needed = choose - picked.length;
    for (let index = start; index <= items.length - needed; index += 1) {
      const item = items[index];
      if (item === undefined) continue;
      picked.push(item);
      visit(index + 1, picked);
      picked.pop();
    }
  }
  visit(0, []);
  return result;
}
