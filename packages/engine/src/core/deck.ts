// Baraja española + comodines. Contrato §3.1.
import {
  type Card,
  type CardId,
  type Rank,
  type Suit,
  SUITS,
  cardPoints as cardPointsProto,
  makeCardId,
} from '@ronda/protocol';
import { DEFAULT_CONFIG, type GameConfig } from '@ronda/protocol';

/**
 * Puntos de una carta. Reexporta la implementación de @ronda/protocol para no
 * duplicar lógica: un solo sitio que sabe puntuar cartas. El comodín respeta
 * config.jokerPoints.
 */
export const cardPoints = (card: Card, config: GameConfig): number =>
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
    // Puntos según config por defecto; buildDeck(config) recalcula con la config
    // de la sala al construir el mazo completo.
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
 * Construye la baraja para una partida.
 *
 *   - 48 cartas: rangos 1..12 en los cuatro palos.
 *   - + 2 comodines (joker-1, joker-2) si config.jokers === 2.
 *   - + 0 comodines si config.jokers === 0.
 *
 * Los `points` de cada carta se fijan con la `config` de la sala (el comodín
 * vale config.jokerPoints). Orden estable: palos en orden de SUITS, rangos
 * ascendentes, comodines al final.
 */
export function buildDeck(config: GameConfig): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 12; rank++) {
      deck.push(buildSuitCard(suit, rank as Rank));
    }
  }
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
