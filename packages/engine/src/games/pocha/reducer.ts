// Reducer de Pocha: createInitialState + applyAction. Contrato §9.
//
// Reglas duras (iguales que Chinchón, §3):
//   - Inmutable: siempre devuelve un estado nuevo (copia profunda de lo mutado).
//   - Puro: el `now` se recibe como parámetro. Sin Date, sin Math.random.
//   - Validación total: aplica turno, fase y legalidad.
//
// A diferencia de Chinchón, cada acción externa bombea la versión UNA sola
// vez (aquí no hay el doble-bump que tiene `endRound` de Chinchón al
// encadenarse con `applyClose`): más simple de razonar y cumple igual el
// invariante "version sube en cada acción que muta estado público".
//
// Fuera de alcance de este paquete (P22, packages/engine): el mecanismo de
// abandono/desconexión de §9.9 (anular la ronda en curso sin puntuar) es
// responsabilidad de apps/server, igual que en Chinchón -- el motor de
// Chinchón tampoco tiene una `GameAction` para "jugador se fue" (lo gestiona
// `room-manager.ts` mutando `room.state` directamente). `PochaPlayer.left`
// existe aquí solo para que rondas FUTURAS puedan excluir a quien ya se fue,
// tal y como hace Chinchón con su propio `left`.
import {
  type CardId,
  type GameAction,
  type GameEvent,
  type PlayerId,
  type Result,
  parseCardId,
  ok,
  err,
} from '@ronda/protocol';
import { shuffle } from '../../core/rng.ts';
import { buildPochaDeck } from './deck.ts';
import { roundSizeFor, totalRounds } from './rounds.ts';
import { resolveTrick } from './trick.ts';
import {
  type PochaState,
  activePlayers,
  findPlayer,
  isPlayerTurn,
  nextActiveSeat,
} from './state.ts';

// ---------------------------------------------------------------------------
// Utilidades de inmutabilidad
// ---------------------------------------------------------------------------

/** Clona el estado a profundidad suficiente para que mutar `next` no afecte a `prev`. */
function cloneState(s: PochaState): PochaState {
  return {
    ...s,
    rng: { ...s.rng },
    players: s.players.map((p) => ({ ...p, hand: [...p.hand] })),
    currentTrick: s.currentTrick.map((t) => ({ ...t })),
    rematchVotes: [...s.rematchVotes],
    roundResult: s.roundResult ? { rows: s.roundResult.rows.map((r) => ({ ...r })) } : null,
  };
}

/** Bump de versión + clon. Helper común al inicio de aplicar una acción. */
function bump(s: PochaState): PochaState {
  const next = cloneState(s);
  next.version = s.version + 1;
  return next;
}

// ---------------------------------------------------------------------------
// createInitialState (reparto de la primera ronda)
// ---------------------------------------------------------------------------

export function createInitialState(input: {
  config: PochaState['config'];
  players: { playerId: PlayerId; nick: string; seat: number }[];
  seed: string;
  roomCode?: PochaState['roomCode'];
}): PochaState {
  const { config, players, seed } = input;
  const playersSorted = [...players].sort((a, b) => a.seat - b.seat);
  const n = playersSorted.length;

  const state: PochaState = {
    version: 0,
    status: 'playing',
    phase: 'bidding',
    config,
    gameId: 'pocha',
    roomCode: input.roomCode ?? '',
    rng: { seed, calls: 0 },
    playerCount: n,
    round: 1,
    roundSize: roundSizeFor(1, n),
    dealerSeat: 0, // repartidor de la ronda 1 es el asiento 0 (§9.2)
    trumpSuit: null,
    trumpCardId: null,
    turnSeat: null,
    leadSuit: null,
    currentTrick: [],
    players: playersSorted.map((p) => ({
      playerId: p.playerId,
      nick: p.nick,
      seat: p.seat,
      score: 0,
      left: false,
      hand: [],
      bid: null,
      tricksWon: 0,
      exactBidsTotal: 0,
      tricksWonTotal: 0,
    })),
    roundResult: null,
    winnerId: null,
    rematchVotes: [],
  };

  return dealRound(state);
}

/**
 * Reparte una ronda nueva sobre `state` (lo clona, no bombea versión -- lo
 * hace el llamador, igual que en Chinchón). §9.3:
 *   - Baraja la baraja de 40 cartas con el RNG del estado.
 *   - `roundSize` cartas a cada jugador activo, una a una, desde
 *     (dealerSeat+1) saltando a quien se haya ido.
 *   - 1 carta revelada para fijar el triunfo, si `config.trump`.
 *   - El resto de cartas sobrantes se descarta (no se usa esa ronda, §9.3.5).
 */
export function dealRound(s: PochaState): PochaState {
  const next = cloneState(s);

  const fullDeck = buildPochaDeck();
  const sh = shuffle(fullDeck, next.rng.seed, next.rng.calls);
  let pool: CardId[] = sh.items.map((c) => c.id);
  next.rng.calls = sh.calls;

  for (const p of next.players) {
    p.hand = [];
    p.bid = null;
    p.tricksWon = 0;
  }
  next.currentTrick = [];
  next.leadSuit = null;

  const order = dealOrder(next);
  for (let card = 0; card < next.roundSize; card++) {
    for (const seat of order) {
      const p = next.players[seat];
      const c = pool[0];
      if (p && c) {
        p.hand.push(c);
        pool = pool.slice(1);
      }
    }
  }

  // Revela 1 carta para fijar el triunfo (§9.3.3), si config.trump.
  if (next.config.trump) {
    const top = pool[0];
    if (top) {
      const parsed = parseCardId(top);
      next.trumpCardId = top;
      next.trumpSuit = parsed.ok && parsed.value.suit !== null ? parsed.value.suit : null;
      pool = pool.slice(1);
    } else {
      next.trumpCardId = null;
      next.trumpSuit = null;
    }
  } else {
    next.trumpCardId = null;
    next.trumpSuit = null;
  }
  // El resto de `pool` (si sobra) se queda fuera de juego esta ronda: no se
  // guarda en ningún sitio del estado a propósito (§9.3.5).

  next.phase = 'bidding';
  const firstSeat = order[0] ?? null;
  next.turnSeat = firstSeat;

  return next;
}

/** Orden de reparto/cante/primera baza: asientos activos empezando en (dealerSeat+1) % n. */
function dealOrder(state: PochaState): number[] {
  const n = state.players.length;
  const out: number[] = [];
  for (let i = 1; i <= n; i++) {
    const seat = (state.dealerSeat + i) % n;
    const p = state.players[seat];
    if (p && !p.left) out.push(seat);
  }
  return out;
}

// ---------------------------------------------------------------------------
// applyAction: dispatch
// ---------------------------------------------------------------------------

export function applyAction(
  state: PochaState,
  playerId: PlayerId,
  action: GameAction,
  // `now` forma parte de la firma del contrato (§3). Pocha no lo necesita:
  // las reglas no dependen del tiempo (sin timeouts en el motor).
  now: number,
): Result<{ state: PochaState; events: GameEvent[] }> {
  void now;
  const events: GameEvent[] = [];

  switch (action.type) {
    case 'bid':
      return applyBid(state, playerId, action.amount, events);
    case 'playCard':
      return applyPlayCard(state, playerId, action.cardId, events);
    case 'nextRound':
      return applyNextRound(state, playerId, events);
    // El resto de GameAction (drawDeck/drawDiscard/discard/close/sortHand) es
    // vocabulario de Chinchón: no tienen sentido en Pocha (§10.4).
    default:
      return err('INVALID_ACTION');
  }
}

// ---------------------------------------------------------------------------
// bid (cante, §9.4)
// ---------------------------------------------------------------------------

function applyBid(
  state: PochaState,
  playerId: PlayerId,
  amount: number,
  events: GameEvent[],
): Result<{ state: PochaState; events: GameEvent[] }> {
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');
  if (state.phase !== 'bidding') return err('INVALID_ACTION');
  if (!Number.isInteger(amount) || amount < 0 || amount > state.roundSize) {
    return err('INVALID_BID');
  }

  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');

  // El repartidor canta siempre el último (§9.2/§9.4: el orden de cante es
  // el mismo que el de reparto, que empieza a su izquierda y termina en él).
  // Por eso basta comprobar `seat === dealerSeat` para saber que este es el
  // cante sujeto al enganche, sin necesitar un contador aparte.
  if (seat === state.dealerSeat) {
    const others = state.players.filter((p, i) => i !== seat && !p.left);
    const sumOthers = others.reduce((sum, p) => sum + (p.bid ?? 0), 0);
    const forbidden = state.roundSize - sumOthers;
    if (forbidden >= 0 && forbidden <= state.roundSize && amount === forbidden) {
      return err('BID_HOOKED');
    }
  }

  const next = bump(state);
  const np = next.players[seat];
  if (!np) return err('INVALID_ACTION');
  np.bid = amount;
  events.push({ t: 'bid', playerId, amount });

  if (seat === next.dealerSeat) {
    // El repartidor acaba de cantar: termina la fase de cante, empieza la
    // primera baza. Lleva la primera baza el jugador a su izquierda (§9.5),
    // el mismo asiento con el que empezó el reparto y el cante.
    next.phase = 'trick';
    const order = dealOrder(next);
    next.turnSeat = order[0] ?? null;
  } else {
    next.turnSeat = nextActiveSeat(next, seat);
  }

  return ok({ state: next, events });
}

// ---------------------------------------------------------------------------
// playCard (juego de bazas, §9.5-§9.6)
// ---------------------------------------------------------------------------

function applyPlayCard(
  state: PochaState,
  playerId: PlayerId,
  cardId: CardId,
  events: GameEvent[],
): Result<{ state: PochaState; events: GameEvent[] }> {
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');
  if (state.phase !== 'trick') return err('INVALID_ACTION');

  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const player = state.players[seat];
  if (!player) return err('INVALID_ACTION');
  if (!player.hand.includes(cardId)) return err('CARD_NOT_IN_HAND');

  const parsed = parseCardId(cardId);
  if (!parsed.ok || parsed.value.suit === null) return err('INVALID_ACTION');
  const cardSuit = parsed.value.suit;

  // Obligación de asistir (§9.5): si hay palo que salió y el jugador tiene
  // alguna carta de ese palo, tiene que jugar una de ellas.
  if (state.leadSuit !== null && cardSuit !== state.leadSuit) {
    const hasLeadSuit = player.hand.some((id) => {
      const r = parseCardId(id);
      return r.ok && r.value.suit === state.leadSuit;
    });
    if (hasLeadSuit) return err('MUST_FOLLOW_SUIT');
  }

  const next = bump(state);
  const np = next.players[seat];
  if (!np) return err('INVALID_ACTION');
  np.hand = np.hand.filter((c) => c !== cardId);
  if (next.leadSuit === null) next.leadSuit = cardSuit;
  next.currentTrick = [...next.currentTrick, { seat, cardId }];
  events.push({ t: 'cardPlayed', playerId, cardId });

  const activeCount = activePlayers(next).length;
  if (next.currentTrick.length < activeCount) {
    next.turnSeat = nextActiveSeat(next, seat);
    return ok({ state: next, events });
  }

  // Baza completa: se resuelve (§9.6).
  const leadSuit = next.leadSuit;
  if (leadSuit === null) return err('INVALID_ACTION'); // no debería pasar: ya se fijó arriba
  const winnerSeat = resolveTrick(next.currentTrick, leadSuit, next.trumpSuit, next.config.rankOrder);
  const winner = next.players[winnerSeat];
  if (!winner) return err('INVALID_ACTION');
  winner.tricksWon += 1;
  events.push({ t: 'trickWon', playerId: winner.playerId, cards: next.currentTrick.map((t) => t.cardId) });
  next.currentTrick = [];
  next.leadSuit = null;

  const roundOver = next.players.every((p) => p.left || p.hand.length === 0);
  if (!roundOver) {
    next.turnSeat = winnerSeat; // quien gana la baza lleva la siguiente (§9.5)
    return ok({ state: next, events });
  }

  return endRound(next, events);
}

// ---------------------------------------------------------------------------
// Fin de ronda y puntuación (§9.7, §9.8)
// ---------------------------------------------------------------------------

function endRound(
  state: PochaState,
  events: GameEvent[],
): Result<{ state: PochaState; events: GameEvent[] }> {
  const scores: { playerId: PlayerId; delta: number; total: number }[] = [];
  const rows: NonNullable<PochaState['roundResult']>['rows'] = [];

  for (const p of state.players) {
    if (p.left) continue;
    const bid = p.bid ?? 0;
    const exact = bid === p.tricksWon;
    const delta = exact ? 10 + p.tricksWon : 0; // §9.7
    p.score += delta;
    if (exact) p.exactBidsTotal += 1;
    p.tricksWonTotal += p.tricksWon;
    rows.push({ playerId: p.playerId, bid, tricksWon: p.tricksWon, delta, total: p.score });
    scores.push({ playerId: p.playerId, delta, total: p.score });
  }

  state.roundResult = { rows };
  events.push({ t: 'roundScored', scores });
  state.turnSeat = null;

  const isLastRound = state.round >= totalRounds(state.playerCount);
  if (isLastRound) {
    state.status = 'gameEnd';
    state.winnerId = decideWinner(state);
    events.push({ t: 'gameOver', winnerId: state.winnerId ?? '' });
  } else {
    state.status = 'roundEnd';
  }

  return ok({ state, events });
}

/**
 * Decide el ganador al final de la partida. §9.8 (desempate en cascada,
 * aprobado por Unai): total más alto → más cantes acertados en toda la
 * partida → más bazas ganadas en total → asiento más bajo.
 */
function decideWinner(state: PochaState): PlayerId | null {
  const candidates = state.players
    .filter((p) => !p.left)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      if (a.exactBidsTotal !== b.exactBidsTotal) return b.exactBidsTotal - a.exactBidsTotal;
      if (a.tricksWonTotal !== b.tricksWonTotal) return b.tricksWonTotal - a.tricksWonTotal;
      return a.seat - b.seat;
    });
  return candidates[0]?.playerId ?? null;
}

// ---------------------------------------------------------------------------
// nextRound (confirmación en roundEnd, reutiliza la acción de Chinchón §10.4)
// ---------------------------------------------------------------------------

function applyNextRound(
  state: PochaState,
  playerId: PlayerId,
  events: GameEvent[],
): Result<{ state: PochaState; events: GameEvent[] }> {
  if (state.status !== 'roundEnd') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');

  const next = bump(state);
  if (!next.rematchVotes.includes(playerId)) next.rematchVotes.push(playerId);

  const actives = activePlayers(next);
  const allConfirmed = actives.every((p) => next.rematchVotes.includes(p.playerId));
  if (!allConfirmed) {
    return ok({ state: next, events });
  }

  next.rematchVotes = [];
  next.round += 1;
  next.roundSize = roundSizeFor(next.round, next.playerCount);
  const dealerNext = nextActiveSeat(next, next.dealerSeat);
  next.dealerSeat = dealerNext ?? next.dealerSeat;
  next.status = 'playing';
  next.roundResult = null;

  const dealt = dealRound(next);
  events.push({ t: 'dealt', round: dealt.round });
  if (dealt.config.trump && dealt.trumpCardId) {
    events.push({ t: 'trumpRevealed', cardId: dealt.trumpCardId });
  }
  return ok({ state: dealt, events });
}
