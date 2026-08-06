// Política de decisión del bot de Chinchón: qué jugada hacer dado lo que ve.
//
// Política: si puede cerrar, cierra; si la cima del descarte reduce sus
// puntos sueltos, la roba; si no, roba del mazo; descarta la carta suelta de
// más puntos. Solo tiene que ser LEGAL y RÁPIDA, no buena jugando (P9,
// sim/bot.ts). Función pura sobre la vista censurada del propio jugador: ni
// sabe de sockets ni de salas, así que la reutilizan tanto el simulador
// (sim/bot.ts, contra un servidor real por socket) como el modo "contra la
// máquina" en vivo (bot-driver.ts, contra el RoomManager directamente).
import type { CardId, ChinchonPlayerView, GameAction, PochaPlayerView } from '@ronda/protocol';
import { cardPoints, parseCardId } from '@ronda/protocol';
import { fuerza } from '@ronda/engine';

export function decideChinchonAction(view: ChinchonPlayerView): GameAction | null {
  const me = view.me;
  const actions = new Set(me.availableActions);

  // Fase draw.
  if (actions.has('drawDiscard') && view.discardTop) {
    return { type: 'drawDiscard' };
  }
  if (actions.has('drawDeck')) {
    return { type: 'drawDeck' };
  }
  // Fase discard: si puede cerrar, cierra.
  if (actions.has('close') && me.closableDiscards.length > 0) {
    const card = me.closableDiscards[0];
    if (card) return { type: 'close', cardId: card };
  }
  if (actions.has('discard')) {
    // Descarta la carta suelta de más puntos (no en bestMelds).
    const inMeld = new Set<CardId>(me.bestMelds.flat());
    const candidates = me.hand.filter((c) => !inMeld.has(c) && c !== me.lockedCardId);
    const pick =
      candidates.length > 0
        ? candidates.reduce((a, b) => (cardScore(a) > cardScore(b) ? a : b))
        : (me.hand.find((c) => c !== me.lockedCardId) ?? me.hand[0]);
    if (pick) return { type: 'discard', cardId: pick };
  }
  return null;
}

/** Heurística de "peligrosidad" de una carta suelta: sus puntos (§5.5). */
function cardScore(id: CardId): number {
  const parsed = parseCardId(id);
  return parsed.ok ? cardPoints(parsed.value) : 0;
}

// ---------------------------------------------------------------------------
// Pocha: misma filosofía que decideChinchonAction -- legal y rápido, no
// necesariamente buena jugando (§9). Función pura sobre la vista censurada
// del propio jugador, reutilizada por el modo "contra la máquina" en vivo
// (bot-driver.ts).
// ---------------------------------------------------------------------------

export function decidePochaAction(view: PochaPlayerView): GameAction | null {
  const me = view.me;
  const actions = new Set(me.availableActions);
  const mySeat = view.players.find((p) => p.playerId === me.playerId)?.seat ?? null;

  if (actions.has('bid')) {
    return { type: 'bid', amount: decideBid(view, mySeat) };
  }
  if (actions.has('playCard')) {
    const cardId = decideCard(view, mySeat);
    if (cardId) return { type: 'playCard', cardId };
  }
  return null;
}

/**
 * Estimación simple del cante: cuenta cartas "fuertes" de la mano (rango >=
 * 10, o del palo de triunfo). Si el bot es el repartidor, evita el valor
 * prohibido por el enganche (§9.4) -- mismo cálculo que hace el reducer
 * (`packages/engine/src/games/pocha/reducer.ts`, `applyBid`).
 */
function decideBid(view: PochaPlayerView, mySeat: number | null): number {
  const strong = view.me.hand.filter((id) => {
    const parsed = parseCardId(id);
    if (!parsed.ok || parsed.value.suit === null || parsed.value.rank === null) return false;
    return parsed.value.rank >= 10 || (view.trumpSuit !== null && parsed.value.suit === view.trumpSuit);
  }).length;
  let amount = Math.min(view.roundSize, Math.max(0, strong));

  if (mySeat !== null && mySeat === view.dealerSeat) {
    let sumOthers = 0;
    view.bids.forEach((b, seat) => {
      if (seat !== mySeat) sumOthers += b ?? 0;
    });
    const forbidden = view.roundSize - sumOthers;
    if (forbidden >= 0 && forbidden <= view.roundSize && amount === forbidden) {
      amount = amount + 1 <= view.roundSize ? amount + 1 : Math.max(0, amount - 1);
    }
  }
  return amount;
}

/**
 * Elige de `me.legalCardIds` (el servidor ya respeta la obligación de
 * asistir, §9.5): si va por debajo de su cante, juega la carta legal más
 * fuerte (intenta ganar la baza); si no, la más floja (evita pasarse).
 */
function decideCard(view: PochaPlayerView, mySeat: number | null): CardId | null {
  const legal = view.me.legalCardIds;
  if (legal.length === 0) return null;
  const bid = mySeat !== null ? (view.bids[mySeat] ?? 0) : 0;
  const won = mySeat !== null ? (view.tricksWon[mySeat] ?? 0) : 0;
  const wantsToWin = won < bid;

  const sorted = [...legal].sort((a, b) => cardStrength(view, a) - cardStrength(view, b));
  return (wantsToWin ? sorted[sorted.length - 1] : sorted[0]) ?? null;
}

function cardStrength(view: PochaPlayerView, id: CardId): number {
  const parsed = parseCardId(id);
  if (!parsed.ok || parsed.value.suit === null || parsed.value.rank === null) return 0;
  const base = fuerza(parsed.value.rank, view.config.rankOrder);
  const isTrump = view.trumpSuit !== null && parsed.value.suit === view.trumpSuit;
  return isTrump ? base + 100 : base;
}
