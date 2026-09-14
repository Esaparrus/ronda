// Baraja de Pocha. Contrato §9.1: española, 40 cartas (sin 8 ni 9), sin
// comodines, sin variante configurable. Reutiliza `buildRankSuitDeck`
// (core/deck.ts), la pieza genérica extraída en P22 al comparar con
// Chinchón -- Pocha no necesita `config` para construir su baraja porque no
// tiene comodines ni puntos por carta configurables.
import type { Card, Rank } from '@ronda/protocol';
import { buildRankSuitDeck } from '../../core/deck.ts';

/** Rangos de la baraja española de Pocha: 1-7, 10 (sota), 11 (caballo), 12 (rey). */
export const POCHA_RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

/** Nº de cartas de la baraja de Pocha (10 rangos × 4 palos). Contrato §9.1/§9.2 (D=40). */
export const POCHA_DECK_SIZE = 40;

/** Construye las 40 cartas de la baraja de Pocha. Sin comodines, sin config. */
export function buildPochaDeck(): Card[] {
  return buildRankSuitDeck(POCHA_RANKS);
}
