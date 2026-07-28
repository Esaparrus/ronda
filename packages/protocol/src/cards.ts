// Cartas de la baraja española + comodines. Contrato §2.1, §3.1.
import type { CardId } from './ids.ts';
import type { GameConfig } from './config.ts';

export type Suit = 'oros' | 'copas' | 'espadas' | 'bastos';

export const SUITS: readonly Suit[] = ['oros', 'copas', 'espadas', 'bastos'];

/** Rango numérico de una carta no comodín: 1..12. */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface Card {
  id: CardId;
  suit: Suit | null;
  rank: Rank | null;
  isJoker: boolean;
  points: number;
}

const SUIT_SET: ReadonlySet<string> = new Set(SUITS);

/**
 * Puntos de una carta. Contrato §5.5:
 *   - rangos 1..9 → su valor
 *   - rangos 10,11,12 → 10
 *   - comodín → config.jokerPoints
 *
 * La firma recibe `config` para que el comodín respete la configuración.
 * Las cartas no comodín ignoran la config.
 */
export function cardPoints(card: Card, config: GameConfig): number {
  if (card.isJoker) return config.jokerPoints;
  if (card.rank === null) return 0;
  return card.rank <= 9 ? card.rank : 10;
}

/** Construye el id canónico de una carta a partir de sus componentes. */
export function makeCardId(parts: { suit: Suit; rank: Rank } | { joker: 1 | 2 }): CardId {
  if ('joker' in parts) return `joker-${parts.joker}`;
  return `${parts.suit}-${parts.rank}`;
}

export type ParseCardError =
  | { kind: 'empty' }
  | { kind: 'bad_format'; raw: string }
  | { kind: 'bad_suit'; raw: string }
  | { kind: 'bad_rank'; raw: string }
  | { kind: 'bad_joker'; raw: string };

/**
 * Parsea un CardId en su estructura Card. Pura, sin lanzar.
 *
 * - 'oros-7'        → { suit: 'oros', rank: 7, isJoker: false, ... }
 * - 'copas-12'      → { suit: 'copas', rank: 12, ... }
 * - 'joker-1'       → { isJoker: true, joker: 1, ... }
 * - 'oros-13'       → error (rank fuera de rango)
 * - 'oros-0'        → error
 * - 'picas-1'       → error (palo inválido)
 */
export function parseCardId(id: CardId): { ok: true; value: Card } | { ok: false; error: ParseCardError } {
  const raw = id.trim();

  if (raw.length === 0) return { ok: false, error: { kind: 'empty' } };

  // Joker: 'joker-1' | 'joker-2'
  if (raw.startsWith('joker-')) {
    const nStr = raw.slice('joker-'.length);
    if (nStr !== '1' && nStr !== '2') {
      return { ok: false, error: { kind: 'bad_joker', raw } };
    }
    const joker = Number(nStr) as 1 | 2;
    return {
      ok: true,
      value: {
        id: `joker-${joker}`,
        suit: null,
        rank: null,
        isJoker: true,
        points: 0, // puntos dependen de config; se calculan con cardPoints()
      },
    };
  }

  // Carta normal: '<suit>-<rank>'
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
  if (!Number.isInteger(rankNum) || rankNum < 1 || rankNum > 12) {
    return { ok: false, error: { kind: 'bad_rank', raw } };
  }
  const rank = rankNum as Rank;
  const suit = suitStr as Suit;
  const card: Card = {
    id: `${suit}-${rank}`,
    suit,
    rank,
    isJoker: false,
    points: rank <= 9 ? rank : 10,
  };
  return { ok: true, value: card };
}

/** Type guard: ¿es un palo válido? */
export const isSuit = (v: unknown): v is Suit =>
  typeof v === 'string' && SUIT_SET.has(v);
