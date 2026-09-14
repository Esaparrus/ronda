// Baraja de Mus. Contrato §12.1: española, 40 cartas (sin 8 ni 9), sin
// comodines. Exactamente la misma que Pocha (§9.1), así que reutiliza la
// misma pieza genérica `buildRankSuitDeck` (core/deck.ts) en vez de declarar
// una tercera baraja idéntica.
//
// La variante "ocho reyes" (§12.1) NO cambia la baraja: siguen siendo las
// mismas 40 cartas. Solo cambia la fuerza con la que se comparan (hand.ts).
import type { Card, Rank } from '@ronda/protocol';
import { buildRankSuitDeck } from '../../core/deck.ts';

/** Rangos de la baraja española de Mus: 1-7, 10 (sota), 11 (caballo), 12 (rey). */
export const MUS_RANKS: readonly Rank[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

/** Nº de cartas de la baraja de Mus (10 rangos × 4 palos). Contrato §12.1. */
export const MUS_DECK_SIZE = 40;

/** Cartas que recibe cada jugador. Contrato §12.4. Fijo, no configurable. */
export const MUS_HAND_SIZE = 4;

/** Jugadores de una partida de Mus. Contrato §12.2: exactamente 4. */
export const MUS_PLAYERS = 4;

/** Construye las 40 cartas de la baraja de Mus. */
export function buildMusDeck(): Card[] {
  return buildRankSuitDeck(MUS_RANKS);
}
