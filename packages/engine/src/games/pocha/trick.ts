// Fuerza de las cartas y resolución de bazas. Contrato §9.6.
import { parseCardId, type CardId, type Rank, type Suit } from '@ronda/protocol';

/**
 * Tabla de fuerza `brisca`/`tute`: As y Tres por encima de las figuras.
 * Solo cubre los 10 rangos de la baraja de Pocha (§9.1). Contrato §9.6.
 */
const FUERZA_BRISCA: Readonly<Record<number, number>> = {
  1: 10, // As, la más fuerte
  3: 9, // Tres
  12: 8, // Rey
  11: 7, // Caballo
  10: 6, // Sota
  7: 5,
  6: 4,
  5: 3,
  4: 2,
  2: 1, // la más débil
};

/**
 * Fuerza de un rango según el orden configurado. `numerico`: el propio
 * `rank` (12 el más alto, 1 el más bajo, igual que el resto del motor).
 * `brisca`: tabla de arriba.
 */
export function fuerza(rank: Rank, rankOrder: 'numerico' | 'brisca'): number {
  if (rankOrder === 'numerico') return rank;
  return FUERZA_BRISCA[rank] ?? 0;
}

export interface TrickCard {
  seat: number;
  cardId: CardId;
}

/**
 * Decide el ganador de una baza ya completa (todas las cartas jugadas).
 * Algoritmo del contrato §9.6:
 *   1. Si hay triunfo Y alguna carta jugada es de ese palo: gana quien jugó
 *      la carta de triunfo con mayor fuerza.
 *   2. Si no: gana quien jugó la carta del palo que salió con mayor fuerza
 *      (las cartas de otros palos, jugadas por no poder asistir, no cuentan).
 *
 * Devuelve el `seat` ganador. Lanza si `trick` está vacío o si alguna
 * `cardId` no se puede parsear -- ambos son errores de programación del
 * llamador (el reducer nunca debería pasar una baza vacía o corrupta), no
 * casos de validación de usuario.
 */
export function resolveTrick(
  trick: readonly TrickCard[],
  leadSuit: Suit,
  trumpSuit: Suit | null,
  rankOrder: 'numerico' | 'brisca',
): number {
  if (trick.length === 0) throw new Error('resolveTrick: baza vacía');

  const played = trick.map((t) => {
    const parsed = parseCardId(t.cardId);
    if (!parsed.ok || parsed.value.suit === null || parsed.value.rank === null) {
      throw new Error(`resolveTrick: cardId inválida en la baza: ${t.cardId}`);
    }
    return { seat: t.seat, suit: parsed.value.suit, rank: parsed.value.rank };
  });

  const trumps = trumpSuit ? played.filter((p) => p.suit === trumpSuit) : [];
  const pool = trumps.length > 0 ? trumps : played.filter((p) => p.suit === leadSuit);

  let best = pool[0];
  for (const p of pool) {
    if (best === undefined || fuerza(p.rank, rankOrder) > fuerza(best.rank, rankOrder)) {
      best = p;
    }
  }
  if (best === undefined) throw new Error('resolveTrick: ninguna carta del palo que salió ni triunfo');
  return best.seat;
}
