// Baraja española + comodines. Contrato §3.1.
//
// P22 extrae `buildRankSuitDeck` (subconjunto de rangos, 4 palos, sin
// comodines) como la pieza genérica de verdad, ahora que hay dos juegos que
// comparar (Chinchón: 48 cartas 1-12 + comodines; Pocha: 40 cartas sin 8/9,
// sin comodines, games/pocha/deck.ts) -- exactamente el punto en el que
// 00-MASTER.md pedía no generalizar antes de tiempo.
import {
  type Card,
  type CardId,
  type Rank,
  type Suit,
  SUITS,
  cardPoints as cardPointsProto,
  makeCardId,
} from '@ronda/protocol';
import { DEFAULT_CONFIG, type ChinchonConfig } from '@ronda/protocol';

/**
 * Puntos de una carta. Reexporta la implementación de @ronda/protocol para no
 * duplicar lógica: un solo sitio que sabe puntuar cartas. El comodín respeta
 * config.jokerPoints. Tipada como `ChinchonConfig` (no `GameConfig`, P22): el
 * comodín y sus puntos son un concepto exclusivo de Chinchón.
 */
export const cardPoints = (card: Card, config: ChinchonConfig): number =>
  cardPointsProto(card, config);

/**
 * Construye una carta concreta de palo y rango. Pura.
 * No es comodín.
 */
function buildSuitCard(suit: Suit, rank: Rank): Card {
  const id: CardId = makeCardId({ suit, rank });
  return {
    id,
    suit,
    rank,
    isJoker: false,
    // Puntos según la fórmula por defecto (§5.5: 1-9 su valor, 10-12 -> 10).
    // Válida tal cual para Pocha (sin config que la recalcule); buildDeck
    // (Chinchón) la recalcula igualmente según config.jokerPoints más abajo.
    points: rank <= 9 ? rank : 10,
  };
}

function buildJoker(n: 1 | 2): Card {
  return {
    id: makeCardId({ joker: n }),
    suit: null,
    rank: null,
    isJoker: true,
    points: DEFAULT_CONFIG.jokerPoints, // recalculado en buildDeck según config
  };
}

/**
 * Pieza genérica de verdad (P22): construye las cartas de un subconjunto de
 * rangos en los cuatro palos, sin comodines. Pura, sin config -- ningún
 * juego necesita parametrizar esto por config, solo por qué rangos incluye
 * su baraja. Orden estable: palos en orden de SUITS, rangos en el orden dado.
 */
export function buildRankSuitDeck(ranks: readonly Rank[]): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of ranks) {
      deck.push(buildSuitCard(suit, rank));
    }
  }
  return deck;
}

const ALL_RANKS: Rank[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

/**
 * Construye la baraja de Chinchón para una partida.
 *
 *   - 48 cartas: rangos 1..12 en los cuatro palos.
 *   - + 2 comodines (joker-1, joker-2) si config.jokers === 2.
 *   - + 0 comodines si config.jokers === 0.
 *
 * Los `points` de cada carta se fijan con la `config` de la sala (el comodín
 * vale config.jokerPoints). Orden estable: palos en orden de SUITS, rangos
 * ascendentes, comodines al final.
 */
export function buildDeck(config: ChinchonConfig): Card[] {
  const deck: Card[] = buildRankSuitDeck(ALL_RANKS);
  if (config.jokers === 2) {
    deck.push(buildJoker(1));
    deck.push(buildJoker(2));
  }
  // Recalcula puntos con la config de la sala (comodín = config.jokerPoints).
  return deck.map((c) => ({ ...c, points: cardPoints(c, config) }));
}

/**
 * Tabla de referencia: id → Card, construida con DEFAULT_CONFIG.
 * Útil para lookup rápido sin reconstruir la baraja. El comodín vale 25 aquí.
 */
export const CARDS_BY_ID: Readonly<Record<CardId, Card>> = Object.freeze(
  buildDeck(DEFAULT_CONFIG).reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {} as Record<CardId, Card>),
);
