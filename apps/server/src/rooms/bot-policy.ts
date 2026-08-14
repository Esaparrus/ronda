// Política de decisión del bot de Chinchón: qué jugada hacer dado lo que ve.
//
// Política: si puede cerrar, cierra; si la cima del descarte reduce sus
// puntos sueltos, la roba; si no, roba del mazo; descarta la carta suelta de
// más puntos. Solo tiene que ser LEGAL y RÁPIDA, no buena jugando (P9,
// sim/bot.ts). Función pura sobre la vista censurada del propio jugador: ni
// sabe de sockets ni de salas, así que la reutilizan tanto el simulador
// (sim/bot.ts, contra un servidor real por socket) como el modo "contra la
// máquina" en vivo (bot-driver.ts, contra el RoomManager directamente).
import type {
  CardId,
  ChinchonPlayerView,
  ClassicPlayerView,
  GameAction,
  MusPlayerView,
  PartyPlayerView,
  PochaPlayerView,
} from '@ronda/protocol';
import { cardPoints, parseCardId } from '@ronda/protocol';
import { escobaValue, fuerza } from '@ronda/engine';

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
    return chooseChinchonDiscard(view);
  }
  return null;
}

/** Descarte automático al agotarse el tiempo; nunca intenta cerrar. */
export function decideChinchonTimeoutDiscard(view: ChinchonPlayerView): GameAction | null {
  if (!view.me.availableActions.includes('discard')) return null;
  return chooseChinchonDiscard(view);
}

function chooseChinchonDiscard(view: ChinchonPlayerView): GameAction | null {
  const inMeld = new Set<CardId>(view.me.bestMelds.flat());
  const candidates = view.me.hand.filter((c) => !inMeld.has(c) && c !== view.me.lockedCardId);
  const pick =
    candidates.length > 0
      ? candidates.reduce((a, b) => (cardScore(a) > cardScore(b) ? a : b))
      : (view.me.hand.find((c) => c !== view.me.lockedCardId) ?? view.me.hand[0]);
  return pick ? { type: 'discard', cardId: pick } : null;
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

// ---------------------------------------------------------------------------
// Mus: bot conservador para practicar y recorrer la partida completa. No
// intenta leer intenciones ni farolear: corta, pasa y rechaza envites. Todas
// las decisiones se toman exclusivamente con la PlayerView censurada del bot.
// ---------------------------------------------------------------------------

export function decideMusAction(view: MusPlayerView): GameAction | null {
  const actions = new Set(view.me.availableActions);

  if (actions.has('repartir')) return { type: 'repartir' };

  // Cortar evita ciclos de descartes indefinidos entre robots y lleva la mano
  // hasta los cuatro lances, que es lo más útil para probar el flujo entero.
  if (actions.has('noMus')) return { type: 'noMus' };
  if (actions.has('mus')) return { type: 'mus' };

  if (actions.has('descartar')) {
    // El motor exige entre una y cuatro cartas. En una vista válida de esta
    // fase la mano contiene cuatro; el slice mantiene el límite del contrato.
    const cardIds = view.me.hand.slice(0, 4);
    return cardIds.length > 0 ? { type: 'descartar', cardIds } : null;
  }

  if (actions.has('declararPares')) {
    return { type: 'declararPares', tiene: view.me.pares !== null };
  }
  if (actions.has('declararJuego')) {
    return { type: 'declararJuego', tiene: view.me.juego.tiene };
  }

  // Ante un envite, la salida conservadora y siempre legal es no querer. Si
  // una variante futura solo permitiese querer, queda cubierto el fallback.
  if (actions.has('noQuerer')) return { type: 'noQuerer' };
  if (actions.has('querer')) return { type: 'querer' };
  if (actions.has('paso')) return { type: 'paso' };

  // `envidar` siempre convive hoy con paso o con una respuesta, pero estos
  // fallbacks impiden bloquear la mesa si una variante cambia ese conjunto.
  if (actions.has('envidar') && view.me.minEnvite !== null) {
    return { type: 'envidar', piedras: view.me.minEnvite };
  }
  if (actions.has('ordago')) return { type: 'ordago' };
  if (actions.has('nextRound')) return { type: 'nextRound' };

  return null;
}

/** Política mínima para poder probar los modos sociales con jugadores IA. */
export function decidePartyAction(view: PartyPlayerView): GameAction | null {
  if (view.gameId === 'orden') {
    const value = [...view.me.hand].sort((a, b) => a - b)[0];
    return value === undefined ? null : { type: 'playNumber', value };
  }
  if (view.gameId === 'colores') {
    const colors = ['rojo', 'azul', 'verde', 'amarillo'].slice(0, view.party.answerCount);
    return { type: 'submitColors', colors };
  }
  if (view.gameId === 'mayoria') {
    return { type: 'submitMajority', answer: 'pizza' };
  }
  if (view.party.cluePlayerId === view.me.playerId) return null;
  return { type: 'submitScale', value: 50 };
}

/** Jugada legal y determinista para los cinco clásicos. */
export function decideClassicAction(view: ClassicPlayerView): GameAction | null {
  const actions = new Set(view.me.availableActions);
  if (actions.has('drawDeck')) {
    return (view.me.total ?? 0) < 5.5 ? { type: 'drawDeck' } : { type: 'stand' };
  }
  if (actions.has('stand')) return { type: 'stand' };
  if (actions.has('pass')) return { type: 'pass' };
  if (actions.has('playCapture')) {
    const cardId = view.me.hand[0];
    if (!cardId) return null;
    return {
      type: 'playCapture',
      cardId,
      captureIds: captureCombination(cardId, view.tableCards),
    };
  }
  if (actions.has('playCard')) {
    const cardId = view.me.legalCardIds[0];
    return cardId ? { type: 'playCard', cardId } : null;
  }
  return null;
}

function captureCombination(cardId: CardId, table: readonly CardId[]): CardId[] {
  const target = 15 - escobaValue(cardId);
  function search(index: number, remaining: number, selected: CardId[]): CardId[] | null {
    if (remaining === 0) return selected;
    if (remaining < 0 || index >= table.length) return null;
    const card = table[index];
    if (!card) return null;
    const taking = search(index + 1, remaining - escobaValue(card), [...selected, card]);
    return taking ?? search(index + 1, remaining, selected);
  }
  return search(0, target, []) ?? [];
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
    return (
      parsed.value.rank >= 10 || (view.trumpSuit !== null && parsed.value.suit === view.trumpSuit)
    );
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
