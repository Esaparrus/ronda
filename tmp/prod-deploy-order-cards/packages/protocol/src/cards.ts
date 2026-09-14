// La baraja española de 40. Contrato §2.1, §3.1, §5.1.
//
// P31: se retiran los comodines y los rangos 8 y 9. Los tres juegos reparten
// ahora exactamente los mismos 40 naipes, así que el comodín deja de ser un
// concepto del dominio: no hay `isJoker`, ni `joker-N`, ni puntos de comodín,
// y `suit`/`rank` dejan de poder ser nulos.
import type { CardId } from './ids.ts';

export type Suit = 'oros' | 'copas' | 'espadas' | 'bastos';

export const SUITS: readonly Suit[] = ['oros', 'copas', 'espadas', 'bastos'];

/** Rango de una carta: la baraja corta, sin ochos ni nueves. */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

/** Los diez rangos, en orden de escalera. Orden canónico de la baraja. */
export const RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

const RANK_SET: ReadonlySet<number> = new Set(RANKS);

export interface Card {
  id: CardId;
  suit: Suit;
  rank: Rank;
  points: number;
}

const SUIT_SET: ReadonlySet<string> = new Set(SUITS);

/**
 * Posición del rango en la escalera, 1..10. Contrato §5.4.
 *
 * Existe porque la baraja de 40 tiene un hueco: del 7 se pasa a la sota. Las
 * escaleras se cuentan sobre esta posición, no sobre el rango, así que
 * 6-7-sota es una escalera de tres y el chinchón (escalera de 7) sigue
 * saliendo. Decisión de Unai al adoptar la baraja de 40 (P31).
 */
export function rankPosition(rank: Rank): number {
  return rank <= 7 ? rank : rank - 2;
}

/**
 * Puntos de una carta. Contrato §5.5: rangos 1..7 su valor, figuras (10, 11,
 * 12) 10 puntos. Ya no depende de la config — lo único que la necesitaba era
 * el comodín, que ya no existe.
 */
export function cardPoints(card: Card): number {
  return card.rank <= 7 ? card.rank : 10;
}

/** Construye el id canónico de una carta a partir de sus componentes. */
export function makeCardId(parts: { suit: Suit; rank: Rank }): CardId {
  return `${parts.suit}-${parts.rank}`;
}

export type ParseCardError =
  | { kind: 'empty' }
  | { kind: 'bad_format'; raw: string }
  | { kind: 'bad_suit'; raw: string }
  | { kind: 'bad_rank'; raw: string };

/**
 * Parsea un CardId en su estructura Card. Pura, sin lanzar.
 *
 * - 'oros-7'   → { suit: 'oros', rank: 7, points: 7 }
 * - 'copas-12' → { suit: 'copas', rank: 12, points: 10 }
 * - 'oros-8'   → error (no está en la baraja de 40)
 * - 'oros-13'  → error (rango fuera de rango)
 * - 'joker-1'  → error (ya no hay comodines)
 * - 'picas-1'  → error (palo inválido)
 */
export function parseCardId(
  id: CardId,
): { ok: true; value: Card } | { ok: false; error: ParseCardError } {
  const raw = id.trim();

  if (raw.length === 0) return { ok: false, error: { kind: 'empty' } };

  const dash = raw.indexOf('-');
  if (dash <= 0 || dash === raw.length - 1) {
    return { ok: false, error: { kind: 'bad_format', raw } };
  }
  const suitStr = raw.slice(0, dash);
  const rankStr = raw.slice(dash + 1);

  if (!SUIT_SET.has(suitStr)) {
    return { ok: false, error: { kind: 'bad_suit', raw } };
  }
  const rankNum = Number(rankStr);
  if (!Number.isInteger(rankNum) || !RANK_SET.has(rankNum)) {
    return { ok: false, error: { kind: 'bad_rank', raw } };
  }
  const rank = rankNum as Rank;
  const suit = suitStr as Suit;
  const card: Card = {
    id: `${suit}-${rank}`,
    suit,
    rank,
    points: rank <= 7 ? rank : 10,
  };
  return { ok: true, value: card };
}

/** Type guard: ¿es un palo válido? */
export const isSuit = (v: unknown): v is Suit => typeof v === 'string' && SUIT_SET.has(v);
