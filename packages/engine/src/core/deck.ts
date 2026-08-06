// La baraja española de 40, común a los tres juegos. Contrato §3.1, §5.1.
//
// P22 extrajo `buildRankSuitDeck` (subconjunto de rangos, 4 palos) como la
// pieza genérica de verdad, cuando Chinchón repartía 48 + 2 comodines y Pocha
// 40 sin ochos ni nueves. P31 iguala las tres barajas: Chinchón pasa también
// a los 40 (decisión de Unai, `01-CONTRATOS.md` §5.1), así que el parámetro
// de rangos sobrevive porque describe bien lo que hace la función, no porque
// hoy haya dos barajas distintas que construir.
import {
  type Card,
  type CardId,
  type Rank,
  type Suit,
  RANKS,
  SUITS,
  cardPoints as cardPointsProto,
  makeCardId,
} from '@ronda/protocol';

/**
 * Puntos de una carta. Reexporta la implementación de @ronda/protocol para no
 * duplicar lógica: un solo sitio que sabe puntuar cartas. Ya no recibe
 * `config` — lo único que la necesitaba era el comodín (P31).
 */
export const cardPoints = (card: Card): number => cardPointsProto(card);

/**
 * Construye una carta concreta de palo y rango. Pura.
 */
function buildSuitCard(suit: Suit, rank: Rank): Card {
  const id: CardId = makeCardId({ suit, rank });
  return {
    id,
    suit,
    rank,
    // §5.5: 1-7 su valor, figuras (10-12) 10 puntos. Igual en los tres juegos.
    points: rank <= 7 ? rank : 10,
  };
}

/**
 * Pieza genérica de verdad (P22): construye las cartas de un subconjunto de
 * rangos en los cuatro palos. Pura, sin config. Orden estable: palos en orden
 * de SUITS, rangos en el orden dado.
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

/** Nº de cartas de la baraja (10 rangos × 4 palos). */
export const DECK_SIZE = 40;

/**
 * Construye la baraja de Chinchón: los 40 naipes de la baraja española, sin
 * ochos, sin nueves y sin comodines (§5.1). Ya no recibe `config`: no queda
 * ninguna variante de sala que cambie con qué cartas se juega.
 */
export function buildDeck(): Card[] {
  return buildRankSuitDeck(RANKS);
}

/**
 * Tabla de referencia: id → Card. Útil para lookup rápido sin reconstruir la
 * baraja.
 */
export const CARDS_BY_ID: Readonly<Record<CardId, Card>> = Object.freeze(
  buildDeck().reduce(
    (acc, c) => {
      acc[c.id] = c;
      return acc;
    },
    {} as Record<CardId, Card>,
  ),
);
