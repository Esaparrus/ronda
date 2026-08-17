// Reducer de Chinchón: applyAction. Contrato §5.2, §5.3, §5.6, §5.7, §5.8.
//
// Reglas duras:
//   - Inmutable: siempre devuelve un estado nuevo (copia profunda de lo mutado).
//   - Puro: el `now` se recibe como parámetro. Sin Date, sin Math.random.
//   - Validación total: aplica turno, fase, propiedad y legalidad.
//
// Turno = 2 pasos (§5.3):
//   draw (obligatorio) → discard | close (obligatorio) → pasa turno.
import {
  type CardId,
  type GameAction,
  type GameEvent,
  type PlayerId,
  type Result,
  ok,
  err,
} from '@ronda/protocol';
import { shuffle } from '../../core/rng.ts';
import { buildDeck } from '../../core/deck.ts';
import {
  type ChinchonPlayer,
  type ChinchonState,
  activePlayers,
  findPlayer,
  isPlayerTurn,
  nextActiveSeat,
} from './state.ts';
import { canCloseWith, isChinchon, solveHand } from './melds.ts';

// ---------------------------------------------------------------------------
// Utilidades de inmutabilidad
// ---------------------------------------------------------------------------

/** Clona el estado a profundidad suficiente para que mutar `next` no afecte a `prev`. */
function cloneState(s: ChinchonState): ChinchonState {
  return {
    ...s,
    rng: { ...s.rng },
    players: s.players.map((p) => ({ ...p, hand: [...p.hand] })),
    deck: [...s.deck],
    discard: [...s.discard],
    rematchVotes: [...s.rematchVotes],
    processedActionIds: [...s.processedActionIds],
    roundResult: s.roundResult ? structuredCloneRoundResult(s.roundResult) : null,
  };
}

function structuredCloneRoundResult(r: NonNullable<ChinchonState['roundResult']>) {
  return {
    closedBy: r.closedBy,
    chinchonBy: r.chinchonBy,
    rows: r.rows.map((row) => ({
      playerId: row.playerId,
      melds: row.melds.map((m) => [...m]),
      leftovers: [...row.leftovers],
      delta: row.delta,
      total: row.total,
      eliminated: row.eliminated,
    })),
  };
}

/** Bump de versión + clon. Helper común al inicio de aplicar una acción. */
function bump(s: ChinchonState): ChinchonState {
  const next = cloneState(s);
  next.version = s.version + 1;
  return next;
}

// ---------------------------------------------------------------------------
// createInitialState (§5.2): reparto de la primera ronda
// ---------------------------------------------------------------------------

export function createInitialState(input: {
  config: ChinchonState['config'];
  players: { playerId: PlayerId; nick: string; seat: number }[];
  seed: string;
  roomCode?: ChinchonState['roomCode'];
}): ChinchonState {
  const { config, players, seed } = input;
  const playersSorted = [...players].sort((a, b) => a.seat - b.seat);

  const state: ChinchonState = {
    version: 0,
    status: 'playing',
    config,
    gameId: config.gameId,
    roomCode: input.roomCode ?? '',
    rng: { seed, calls: 0 },
    round: 1,
    dealerSeat: 0, // repartidor de la ronda 1 es el asiento 0
    turnSeat: null,
    turnPhase: null,
    turnDeadlineAt: null,
    players: playersSorted.map((p) => ({
      playerId: p.playerId,
      nick: p.nick,
      seat: p.seat,
      score: 0,
      eliminated: false,
      left: false,
      hand: [],
      lockedCardId: null,
    })),
    deck: [],
    discard: [],
    roundResult: null,
    winnerId: null,
    rematchVotes: [],
    processedActionIds: [],
  };

  return dealRound(state);
}

/**
 * Reparte una ronda nueva sobre `state` (lo clona). §5.2.
 * - Baraja el mazo completo con el RNG del estado.
 * - 7 cartas a cada jugador activo, una a una, desde (dealerSeat-1) saltando
 *   eliminados/abandonados.
 * - 1 carta al descarte. Resto al mazo.
 * - Empieza el jugador a la derecha del repartidor.
 */
export function dealRound(s: ChinchonState): ChinchonState {
  const next = cloneState(s);

  // Baraja la baraja completa con la semilla y el contador actuales.
  const fullDeck = buildDeck();
  const sh = shuffle(fullDeck, next.rng.seed, next.rng.calls);
  // Trabajamos con CardId[]: el estado solo guarda ids.
  let pool: CardId[] = sh.items.map((c) => c.id);
  next.rng.calls = sh.calls;

  // Limpia manos y descarte.
  for (const p of next.players) {
    p.hand = [];
    p.lockedCardId = null;
  }
  next.discard = [];
  // El servidor fija el nuevo límite al iniciar la ronda. El motor no usa
  // relojes para que siga siendo puro y determinista.
  next.turnDeadlineAt = null;

  // Reparte 7 cartas, una a una, empezando por el siguiente asiento activo al
  // repartidor y rotando saltando eliminados/abandonados.
  const order = dealOrder(next);
  const handSize = next.config.handSize; // 7 (congelado)
  for (let card = 0; card < handSize; card++) {
    for (const seat of order) {
      const p = next.players[seat];
      const c = pool[0];
      if (p && c) {
        p.hand.push(c);
        pool = pool.slice(1);
      }
    }
  }

  // 1 carta al descarte (cima visible).
  const top = pool[0];
  if (top) {
    next.discard.push(top);
    pool = pool.slice(1);
  }
  next.deck = pool;

  // Empieza el jugador a la derecha del repartidor (mismo order[0]).
  const firstSeat = order[0] ?? null;
  next.turnSeat = firstSeat;
  next.turnPhase = firstSeat === null ? null : 'draw';

  return next;
}

/** Orden antihorario de reparto: empieza a la derecha del repartidor. */
function dealOrder(state: ChinchonState): number[] {
  const n = state.players.length;
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    const seat = (state.dealerSeat - i + n) % n;
    const p = state.players[seat];
    if (p && !p.eliminated && !p.left) out.push(seat);
  }
  return out;
}

// ---------------------------------------------------------------------------
// applyAction: dispatch
// ---------------------------------------------------------------------------

export function applyAction(
  state: ChinchonState,
  playerId: PlayerId,
  action: GameAction,
  // `now` forma parte de la firma del contrato (§3). Chinchón no lo necesita:
  // las reglas no dependen del tiempo (sin timeouts en el motor).
  now: number,
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  void now;
  const events: GameEvent[] = [];

  // Idempotencia no se gestiona aquí (lo hace el servidor con clientActionId).
  // El motor solo aplica la acción tal cual.

  switch (action.type) {
    case 'sortHand':
      return applySortHand(state, playerId, action.order, events);
    case 'nextRound':
      return applyNextRound(state, playerId, events);
    case 'drawDeck':
      return applyDrawDeck(state, playerId, events);
    case 'drawDiscard':
      return applyDrawDiscard(state, playerId, events);
    case 'discard':
      return applyDiscard(state, playerId, action.cardId, events);
    case 'close':
      return applyClose(state, playerId, action.cardId, events);
    default:
      return err('INVALID_ACTION');
  }
}

// ---------------------------------------------------------------------------
// sortHand (no consume turno)
// ---------------------------------------------------------------------------

function applySortHand(
  state: ChinchonState,
  playerId: PlayerId,
  order: CardId[],
  events: GameEvent[],
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.eliminated || player.left) return err('PLAYER_ELIMINATED');

  // El nuevo orden debe ser una permutación exacta de la mano actual.
  if (order.length !== player.hand.length) return err('INVALID_ACTION');
  const handSet = new Set(player.hand);
  for (const id of order) {
    if (!handSet.has(id)) return err('CARD_NOT_IN_HAND');
  }
  if (new Set(order).size !== order.length) return err('INVALID_ACTION');

  // No cambia la versión pública (la mano es privada). Clonamos por inmutabilidad
  // pero NO subimos versión: sortHand es local al jugador.
  const next = cloneState(state);
  const np = next.players.find((p) => p.playerId === playerId);
  if (np) np.hand = [...order];
  return ok({ state: next, events });
}

// ---------------------------------------------------------------------------
// nextRound (en roundEnd)
// ---------------------------------------------------------------------------

function applyNextRound(
  state: ChinchonState,
  playerId: PlayerId,
  events: GameEvent[],
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  if (state.status !== 'roundEnd') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.eliminated || player.left) return err('PLAYER_ELIMINATED');

  const next = bump(state);
  if (!next.rematchVotes.includes(playerId)) next.rematchVotes.push(playerId);

  // ¿Todos los activos han confirmado?
  const actives = activePlayers(next);
  const allConfirmed = actives.every((p) => next.rematchVotes.includes(p.playerId));
  if (!allConfirmed) {
    return ok({ state: next, events });
  }

  // Inicia la siguiente ronda: rota repartidor al siguiente asiento activo.
  next.rematchVotes = [];
  next.round += 1;
  const dealerNext = nextActiveSeat(next, next.dealerSeat);
  next.dealerSeat = dealerNext ?? next.dealerSeat;
  next.status = 'playing';
  next.roundResult = null;
  const dealt = dealRound(next);
  dealt.version = next.version; // dealRound no sube versión; la subimos aquí
  events.push({ t: 'dealt', round: next.round });
  return ok({ state: dealt, events });
}

// ---------------------------------------------------------------------------
// drawDeck / drawDiscard (paso 1 del turno)
// ---------------------------------------------------------------------------

function applyDrawDeck(
  state: ChinchonState,
  playerId: PlayerId,
  events: GameEvent[],
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');
  if (state.turnPhase !== 'draw') return err('ALREADY_DREW');

  // Si el mazo está vacío: rebaraja el descarte (menos la cima). §5.3 paso 1.
  let working = state;
  if (working.deck.length === 0) {
    const reshuffled = reshuffleDiscard(working);
    if (reshuffled.deck.length === 0) {
      // Mazo y descarte agotados: la ronda termina sin cierre (§5.3 paso 1).
      return endRoundNoClose(working, [...events, { t: 'deckReshuffled' }]);
    }
    working = reshuffled;
    events.push({ t: 'deckReshuffled' });
  }

  const next = bump(working);
  const seat = next.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const player = next.players[seat];
  if (!player) return err('INVALID_ACTION');

  const card = next.deck[0];
  if (!card) return err('INVALID_ACTION');
  next.deck = next.deck.slice(1);
  player.hand.push(card);
  player.lockedCardId = null; // robar del mazo no bloquea nada
  next.turnPhase = 'discard';
  events.push({ t: 'drewDeck', playerId });
  return ok({ state: next, events });
}

function applyDrawDiscard(
  state: ChinchonState,
  playerId: PlayerId,
  events: GameEvent[],
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');
  if (state.turnPhase !== 'draw') return err('ALREADY_DREW');
  if (state.discard.length === 0) return err('INVALID_ACTION');

  const next = bump(state);
  const seat = next.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const player = next.players[seat];
  if (!player) return err('INVALID_ACTION');

  // Roba la cima del descarte.
  const top = next.discard[next.discard.length - 1];
  if (!top) return err('INVALID_ACTION');
  next.discard = next.discard.slice(0, -1);
  player.hand.push(top);

  // §5.3: si forbidDiscardDrawnCard, la carta robada del descarte queda marcada
  // y no puede descartarse en ESE turno.
  player.lockedCardId = next.config.forbidDiscardDrawnCard ? top : null;

  next.turnPhase = 'discard';
  events.push({ t: 'drewDiscard', playerId, cardId: top });
  return ok({ state: next, events });
}

/**
 * Rebaraja el descarte (menos la cima) como nuevo mazo. §5.3 paso 1.
 * Devuelve un estado clonado con deck y discard actualizados.
 */
function reshuffleDiscard(s: ChinchonState): ChinchonState {
  const next = cloneState(s);
  const top = next.discard[next.discard.length - 1] ?? null;
  const rest = top ? next.discard.slice(0, -1) : [...next.discard];
  const sh = shuffle(rest, next.rng.seed, next.rng.calls);
  next.rng.calls = sh.calls;
  next.deck = sh.items;
  next.discard = top ? [top] : [];
  return next;
}

// ---------------------------------------------------------------------------
// discard / close (paso 2 del turno)
// ---------------------------------------------------------------------------

function applyDiscard(
  state: ChinchonState,
  playerId: PlayerId,
  cardId: CardId,
  events: GameEvent[],
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');
  if (state.turnPhase !== 'discard') return err('MUST_DRAW_FIRST');

  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const player = state.players[seat];
  if (!player) return err('INVALID_ACTION');
  if (!player.hand.includes(cardId)) return err('CARD_NOT_IN_HAND');

  // §5.3: la carta robada del descarte (lockedCardId) no puede descartarse este turno.
  if (player.lockedCardId !== null && cardId === player.lockedCardId) {
    return err('CANNOT_DISCARD_DRAWN_CARD');
  }

  const next = bump(state);
  const np = next.players[seat];
  if (!np) return err('INVALID_ACTION');
  np.hand = np.hand.filter((c) => c !== cardId);
  np.lockedCardId = null;
  next.discard = [...next.discard, cardId];

  events.push({ t: 'discarded', playerId, cardId });
  return advanceTurn(next, events);
}

function applyClose(
  state: ChinchonState,
  playerId: PlayerId,
  cardId: CardId,
  events: GameEvent[],
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');
  if (state.turnPhase !== 'discard') return err('MUST_DRAW_FIRST');

  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const player = state.players[seat];
  if (!player) return err('INVALID_ACTION');
  if (player.hand.length !== 8) return err('CANNOT_CLOSE');
  if (!player.hand.includes(cardId)) return err('CARD_NOT_IN_HAND');
  if (player.lockedCardId !== null && cardId === player.lockedCardId) {
    return err('CANNOT_DISCARD_DRAWN_CARD');
  }

  // ¿Chinchón? La mano de 7 tras descartar cardId forma escalera de 7 sin comodines.
  const remaining = player.hand.filter((c) => c !== cardId);
  const chinchon = isChinchon(remaining);

  // ¿Cierre válido? deadwood tras descartar ≤ umbral.
  const canClose = canCloseWith(player.hand, cardId, state.config);
  if (!chinchon && !canClose) return err('CANNOT_CLOSE');

  const next = bump(state);
  const np = next.players[seat];
  if (!np) return err('INVALID_ACTION');
  np.hand = remaining;
  np.lockedCardId = null;
  next.discard = [...next.discard, cardId];

  if (chinchon) {
    events.push({ t: 'chinchon', playerId });
  } else {
    events.push({ t: 'closed', playerId });
  }

  return endRound(next, seat, chinchon, events);
}

// ---------------------------------------------------------------------------
// Avance de turno y fin de ronda
// ---------------------------------------------------------------------------

/** Pasa el turno al siguiente asiento activo. */
function advanceTurn(
  state: ChinchonState,
  events: GameEvent[],
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  const next = state; // ya clonado y bumped por el llamador
  const cur = next.turnSeat;
  if (cur === null) return ok({ state: next, events });
  const nxt = nextActiveSeat(next, cur);
  if (nxt === null) {
    // Sin siguiente jugador: la ronda termina.
    return endRoundNoClose(next, events);
  }
  next.turnSeat = nxt;
  next.turnPhase = 'draw';
  return ok({ state: next, events });
}

/**
 * Termina la ronda por cierre. §5.8.
 * - Calcula deadwood de cada jugador con solveHand.
 * - El que cerró suma sus puntos (o dryCloseBonus si 0).
 * - Elimina a quien supera eliminationScore.
 * - Decide ganador o siguiente ronda.
 */
function endRound(
  state: ChinchonState,
  closerSeat: number,
  chinchon: boolean,
  events: GameEvent[],
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  const next = bump(state);
  const closer = next.players[closerSeat];
  if (!closer) return err('INVALID_ACTION');
  const closerId = closer.playerId;

  // Chinchón con chinchonEndsGame: la partida termina y gana quien lo hizo.
  if (chinchon && next.config.chinchonEndsGame) {
    next.status = 'gameEnd';
    next.winnerId = closerId;
    next.turnSeat = null;
    next.turnPhase = null;
    const deltas = new Map<PlayerId, number>([[closerId, 0]]);
    const rows = buildRows(next, deltas);
    next.roundResult = {
      closedBy: closerId,
      chinchonBy: closerId,
      rows,
    };
    events.push({ t: 'gameOver', winnerId: closerId });
    return ok({ state: next, events });
  }

  // Puntuación de todos los activos.
  const scored: { playerId: PlayerId; delta: number; total: number }[] = [];
  for (const p of next.players) {
    if (p.eliminated || p.left) continue;
    const sol = solveHand(p.hand);
    let delta = sol.deadwood;
    if (p.playerId === closerId) {
      // El que cierra: si 0 puntos, dryCloseBonus (por defecto -10).
      if (chinchon)
        delta = -25; // chinchón sin endGame: -25 (§5.7)
      else if (sol.deadwood === 0) delta = next.config.dryCloseBonus;
      else delta = sol.deadwood;
    }
    p.score += delta;
    scored.push({ playerId: p.playerId, delta, total: p.score });
  }

  // Eliminación: quien SUPERA eliminationScore queda eliminado.
  for (const p of next.players) {
    if (p.eliminated || p.left) continue;
    if (p.score > next.config.eliminationScore) {
      p.eliminated = true;
      events.push({ t: 'eliminated', playerId: p.playerId });
    }
  }

  const deltas = new Map<PlayerId, number>(scored.map((s) => [s.playerId, s.delta]));
  const rows = buildRows(next, deltas);
  next.roundResult = {
    closedBy: chinchon ? null : closerId,
    chinchonBy: chinchon ? closerId : null,
    rows,
  };

  events.push({ t: 'roundScored', scores: scored });

  // ¿Partida terminada?
  const actives = activePlayers(next);
  if (actives.length <= 1) {
    next.status = 'gameEnd';
    next.winnerId = decideWinner(next, closerId, actives);
    next.turnSeat = null;
    next.turnPhase = null;
    events.push({ t: 'gameOver', winnerId: next.winnerId ?? closerId });
  } else {
    next.status = 'roundEnd';
    next.turnSeat = null;
    next.turnPhase = null;
  }

  return ok({ state: next, events });
}

/** Ronda terminada sin cierre (mazo y descarte agotados). §5.3 paso 1. */
function endRoundNoClose(
  state: ChinchonState,
  events: GameEvent[],
): Result<{ state: ChinchonState; events: GameEvent[] }> {
  const next = bump(state);
  // Todos suman sus puntos sueltos, sin bonificación.
  const scored: { playerId: PlayerId; delta: number; total: number }[] = [];
  for (const p of next.players) {
    if (p.eliminated || p.left) continue;
    const sol = solveHand(p.hand);
    p.score += sol.deadwood;
    scored.push({ playerId: p.playerId, delta: sol.deadwood, total: p.score });
  }
  for (const p of next.players) {
    if (p.eliminated || p.left) continue;
    if (p.score > next.config.eliminationScore) {
      p.eliminated = true;
      events.push({ t: 'eliminated', playerId: p.playerId });
    }
  }
  const deltasNoClose = new Map<PlayerId, number>(scored.map((s) => [s.playerId, s.delta]));
  const rows = buildRows(next, deltasNoClose);
  next.roundResult = { closedBy: null, chinchonBy: null, rows };
  events.push({ t: 'roundScored', scores: scored });

  const actives = activePlayers(next);
  if (actives.length <= 1) {
    next.status = 'gameEnd';
    // Sin closer; gana el de total más bajo (§5.8.5 simplificado).
    next.winnerId = decideWinner(next, null, actives);
    next.turnSeat = null;
    next.turnPhase = null;
    events.push({ t: 'gameOver', winnerId: next.winnerId ?? '' });
  } else {
    next.status = 'roundEnd';
    next.turnSeat = null;
    next.turnPhase = null;
  }
  return ok({ state: next, events });
}

/** Construye las filas del roundResult con melds/leftovers revelados. */
function buildRows(
  state: ChinchonState,
  deltas: Map<PlayerId, number>,
): NonNullable<ChinchonState['roundResult']>['rows'] {
  return state.players
    .filter((p) => !p.left)
    .map((p) => {
      const sol = solveHand(p.hand);
      return {
        playerId: p.playerId,
        melds: sol.melds,
        leftovers: sol.leftovers,
        delta: deltas.get(p.playerId) ?? 0,
        total: p.score,
        eliminated: p.eliminated,
      };
    });
}

/**
 * Decide el ganador. §5.8.5:
 *   - Si queda 1 activo → ese.
 *   - Si quedan 0 (empate por eliminación simultánea):
 *       total más bajo → quien cerró → asiento más bajo.
 */
function decideWinner(
  state: ChinchonState,
  closerId: PlayerId | null,
  actives: ChinchonPlayer[],
): PlayerId | null {
  if (actives.length === 1) return actives[0]?.playerId ?? null;
  // Empate por eliminación simultánea: mira todos los no-abandonados.
  const candidates = state.players
    .filter((p) => !p.left)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score; // total más bajo
      if (closerId !== null) {
        if (a.playerId === closerId && b.playerId !== closerId) return -1;
        if (b.playerId === closerId && a.playerId !== closerId) return 1;
      }
      return a.seat - b.seat; // asiento más bajo
    });
  return candidates[0]?.playerId ?? null;
}
