// Reducer de Mus: createInitialState + applyAction. Contrato §12.
//
// Reglas duras (iguales que Chinchón y Pocha, §3):
//   - Inmutable: siempre devuelve un estado nuevo.
//   - Puro: el `now` se recibe como parámetro. Sin Date, sin Math.random.
//   - Validación total: aplica turno, fase, pareja y legalidad.
//
// Máquina de fases de una mano (§12.5-§12.9):
//
//   mus ──(los cuatro dicen mus)──> descarte ──> mus ──> ...
//    │
//    └──(uno corta)──> grande ──> chica ──> pares ──> juego | punto ──> recuento
//                                  Pares y juego se deducen de las cartas.
//
// Fuera de alcance del motor (§12.11), igual que en Chinchón y Pocha: la
// suspensión de la partida cuando alguien abandona. `MusPlayer.left` existe
// para que el servidor la marque, pero el motor NO salta asientos: no hay Mus
// con tres.
import {
  type GameAction,
  type GameEvent,
  type MusLance,
  type MusPartnerSignal,
  type PlayerId,
  type Result,
  ok,
  err,
} from '@ronda/protocol';
import { shuffle } from '../../core/rng.ts';
import { MUS_HAND_SIZE, MUS_PLAYERS, buildMusDeck } from './deck.ts';
import { juegoSuma, paresOf, tieneJuego } from './hand.ts';
import {
  MUS_META,
  addPiedras,
  eligibleSeats,
  juegoDecided,
  lanceWinnerSeat,
  runRecuento,
} from './recuento.ts';
import {
  type MusState,
  findPlayer,
  isPlayerTurn,
  otherTeam,
  postreSeat,
  seatsFromMano,
  teamOfSeat,
} from './state.ts';

// ---------------------------------------------------------------------------
// Utilidades de inmutabilidad
// ---------------------------------------------------------------------------

/** Clona el estado a profundidad suficiente para que mutar `next` no toque `prev`. */
function cloneState(s: MusState): MusState {
  return {
    ...s,
    rng: { ...s.rng },
    juegosWon: [...s.juegosWon],
    piedras: [...s.piedras],
    deck: [...s.deck],
    discardPile: [...s.discardPile],
    spoken: [...s.spoken],
    bet: s.bet ? { ...s.bet } : null,
    lances: s.lances.map((l) => ({ ...l })),
    players: s.players.map((p) => ({ ...p, hand: [...p.hand] })),
    rematchVotes: [...s.rematchVotes],
    handResult: s.handResult
      ? {
          ...s.handResult,
          hands: s.handResult.hands.map((h) => [...h]),
          rows: s.handResult.rows.map((r) => ({ ...r, tablas: [...r.tablas] })),
          piedras: [...s.handResult.piedras],
        }
      : null,
  };
}

/** Bump de versión + clon. Helper común al inicio de aplicar una acción. */
function bump(s: MusState): MusState {
  const next = cloneState(s);
  next.version = s.version + 1;
  return next;
}

// ---------------------------------------------------------------------------
// createInitialState
// ---------------------------------------------------------------------------

export function createInitialState(input: {
  config: MusState['config'];
  players: { playerId: PlayerId; nick: string; seat: number }[];
  seed: string;
  roomCode?: MusState['roomCode'];
}): MusState {
  const { config, players, seed } = input;
  if (players.length !== MUS_PLAYERS) {
    // Error de programación del llamador, no de validación de usuario: §12.2
    // dice "exactamente 4, ni uno más ni uno menos" y `config.maxPlayers` ya
    // lo fija en 4, así que el servidor nunca debería llegar aquí con otro
    // número. Mismo criterio que `resolveTrick` de Pocha ante una baza vacía.
    throw new Error(
      `mus: se necesitan exactamente ${MUS_PLAYERS} jugadores, llegaron ${players.length}`,
    );
  }
  const playersSorted = [...players].sort((a, b) => a.seat - b.seat);

  const state: MusState = {
    version: 0,
    status: 'playing',
    phase: 'reparto',
    config,
    gameId: 'mus',
    roomCode: input.roomCode ?? '',
    rng: { seed, calls: 0 },
    juegoNumber: 1,
    juegosWon: [0, 0],
    piedras: [0, 0],
    handNumber: 1,
    manoSeat: 0, // el asiento 0 es mano en la primera mano; rota a la derecha (§12.4)
    deck: [],
    discardPile: [],
    lance: null,
    spoken: [false, false, false, false],
    bet: null,
    lances: [],
    musConsultingTeam: null,
    turnSeat: null,
    players: playersSorted.map((p) => ({
      playerId: p.playerId,
      nick: p.nick,
      seat: p.seat,
      teamIndex: teamOfSeat(p.seat),
      left: false,
      hand: [],
      musSaid: null,
      musSignal: null,
      musDelegated: false,
      discarded: false,
      paresDeclared: null,
      juegoDeclared: null,
    })),
    handResult: null,
    winnerTeamIndex: null,
    rematchVotes: [],
  };

  state.turnSeat = postreSeat(state);
  return state;
}

/**
 * Reparte una mano nueva (§12.4): baraja las 40 cartas y da 4 a cada uno, de
 * una en una, empezando por el mano. El resto queda de mazo para los
 * descartes de la fase de mus (§12.5). Clona; no bombea versión (lo hace el
 * llamador), igual que `dealRound` en Pocha.
 */
export function dealHand(s: MusState): MusState {
  const next = cloneState(s);

  const sh = shuffle(
    buildMusDeck().map((c) => c.id),
    next.rng.seed,
    next.rng.calls,
  );
  next.rng.calls = sh.calls;
  let pool = sh.items;

  for (const p of next.players) {
    p.hand = [];
    p.musSaid = null;
    p.discarded = false;
    p.paresDeclared = null;
    p.juegoDeclared = null;
  }

  const order = seatsFromMano(next);
  for (let i = 0; i < MUS_HAND_SIZE; i++) {
    for (const seat of order) {
      const p = next.players[seat];
      const card = pool[0];
      if (p && card) {
        p.hand.push(card);
        pool = pool.slice(1);
      }
    }
  }

  next.deck = pool;
  next.discardPile = [];
  next.lance = null;
  next.lances = [];
  next.bet = null;
  next.spoken = next.players.map(() => false);
  next.handResult = null;
  beginMusRound(next);

  return next;
}

/** Roba una carta del mazo, barajando los descartes si hace falta (§12.5.4). */
function drawOne(s: MusState): string | null {
  if (s.deck.length === 0) {
    if (s.discardPile.length === 0) return null;
    const sh = shuffle(s.discardPile, s.rng.seed, s.rng.calls);
    s.deck = sh.items;
    s.rng.calls = sh.calls;
    s.discardPile = [];
  }
  const card = s.deck[0];
  if (card === undefined) return null;
  s.deck = s.deck.slice(1);
  return card;
}

// ---------------------------------------------------------------------------
// applyAction: dispatch
// ---------------------------------------------------------------------------

export function applyAction(
  state: MusState,
  playerId: PlayerId,
  action: GameAction,
  // Parte de la firma del contrato (§3). Mus no lo necesita: las reglas no
  // dependen del tiempo (sin temporizadores en el motor).
  now: number,
): Result<{ state: MusState; events: GameEvent[] }> {
  void now;
  const events: GameEvent[] = [];

  switch (action.type) {
    case 'repartir':
      return applyRepartir(state, playerId, events);
    case 'mus':
      return applyMus(state, playerId, true, events);
    case 'noMus':
      return applyMus(state, playerId, false, events);
    case 'musSignal':
      return applyMusSignal(state, playerId, action.signal, events);
    case 'descartar':
      return applyDescartar(state, playerId, action.cardIds, events);
    case 'paso':
      return applyPaso(state, playerId, events);
    case 'envidar':
      return applyEnvidar(state, playerId, action.piedras, false, events);
    case 'ordago':
      return applyEnvidar(state, playerId, 0, true, events);
    case 'querer':
      return applyQuerer(state, playerId, events);
    case 'noQuerer':
      return applyNoQuerer(state, playerId, events);
    case 'nextRound':
      return applyNextRound(state, playerId, events);
    // El resto de GameAction es vocabulario de Chinchón o de Pocha.
    default:
      return err('INVALID_ACTION');
  }
}

function applyRepartir(
  state: MusState,
  playerId: PlayerId,
  events: GameEvent[],
): Result<{ state: MusState; events: GameEvent[] }> {
  if (state.status !== 'playing' || state.phase !== 'reparto') return err('INVALID_ACTION');
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');

  const dealt = dealHand(bump(state));
  events.push({ t: 'dealt', round: dealt.handNumber });
  return ok({ state: dealt, events });
}

// ---------------------------------------------------------------------------
// Fase de mus y descarte (§12.5)
// ---------------------------------------------------------------------------

/** Abre una vuelta de mus individual (presencial) o por parejas (online). */
function beginMusRound(state: MusState): void {
  state.phase = 'mus';
  for (const player of state.players) {
    player.musSaid = null;
    player.musSignal = null;
    player.musDelegated = false;
  }

  if (state.config.modo === 'online') {
    state.musConsultingTeam = teamOfSeat(state.manoSeat);
    // La pareja del mano decide simultáneamente; no existe un asiento
    // individual con la palabra mientras dura la consulta privada.
    state.turnSeat = null;
  } else {
    state.musConsultingTeam = null;
    state.turnSeat = state.manoSeat;
  }
}

function clearMusSignals(state: MusState): void {
  state.musConsultingTeam = null;
  for (const player of state.players) {
    player.musSignal = null;
    player.musDelegated = false;
  }
}

/**
 * Cierra con mus la consulta de una pareja. La pareja mano cede la palabra a
 * la rival; la segunda pareja abre el descarte.
 */
function completeOnlineTeamMus(state: MusState, teamIndex: 0 | 1, events: GameEvent[]): MusState {
  for (const player of state.players) {
    if (player.teamIndex === teamIndex) player.musSaid = true;
  }
  events.push({ t: 'musTeamDecided', teamIndex, mus: true });

  const manoTeam = teamOfSeat(state.manoSeat);
  if (teamIndex === manoTeam) {
    state.musConsultingTeam = otherTeam(teamIndex);
    state.turnSeat = null;
    return state;
  }

  state.phase = 'descarte';
  state.turnSeat = state.manoSeat;
  clearMusSignals(state);
  for (const player of state.players) player.discarded = false;
  return state;
}

function applyMusSignal(
  state: MusState,
  playerId: PlayerId,
  signal: MusPartnerSignal,
  events: GameEvent[],
): Result<{ state: MusState; events: GameEvent[] }> {
  if (state.status !== 'playing' || state.phase !== 'mus') return err('NOT_IN_MUS_PHASE');
  if (state.config.modo !== 'online' || state.musConsultingTeam === null) {
    return err('INVALID_ACTION');
  }

  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.teamIndex !== state.musConsultingTeam) return err('NOT_YOUR_TEAM_TURN');
  if (player.musSaid !== null || player.musSignal !== null || player.musDelegated) {
    return err('INVALID_ACTION');
  }

  const partner = state.players.find(
    (candidate) => candidate.teamIndex === player.teamIndex && candidate.playerId !== playerId,
  );
  if (!partner) return err('INVALID_ACTION');
  // Dos "Decide tú" dejarían la mano sin una decisión posible.
  if (signal === 'decideTu' && partner.musDelegated) return err('INVALID_ACTION');

  const next = bump(state);
  const nextPlayer = findPlayer(next, playerId);
  const nextPartner = next.players.find(
    (candidate) => candidate.teamIndex === player.teamIndex && candidate.playerId !== playerId,
  );
  if (!nextPlayer || !nextPartner) return err('INVALID_ACTION');

  nextPlayer.musSignal = signal;
  if (signal === 'decideTu') {
    nextPlayer.musDelegated = true;
    if (nextPartner.musSaid === true) {
      return ok({ state: completeOnlineTeamMus(next, player.teamIndex, events), events });
    }
  }
  return ok({ state: next, events });
}

function applyMus(
  state: MusState,
  playerId: PlayerId,
  wantsMus: boolean,
  events: GameEvent[],
): Result<{ state: MusState; events: GameEvent[] }> {
  if (state.status !== 'playing') return err('INVALID_ACTION');
  if (state.phase !== 'mus') return err('NOT_IN_MUS_PHASE');

  if (state.config.modo === 'online') {
    const consultingTeam = state.musConsultingTeam;
    if (consultingTeam === null) return err('INVALID_ACTION');
    const current = findPlayer(state, playerId);
    if (!current) return err('PLAYER_NOT_IN_ROOM');
    if (current.teamIndex !== consultingTeam) return err('NOT_YOUR_TEAM_TURN');
    if (current.musSaid !== null || current.musDelegated) return err('INVALID_ACTION');

    const next = bump(state);
    const player = findPlayer(next, playerId);
    if (!player) return err('INVALID_ACTION');
    player.musSaid = wantsMus;

    // Basta con que uno de los dos corte. La pareja rival solo recibe esta
    // decisión final, nunca las frases ni el voto parcial del compañero.
    if (!wantsMus) {
      events.push({ t: 'musTeamDecided', teamIndex: consultingTeam, mus: false });
      clearMusSignals(next);
      return ok({ state: beginLance(next, 'grande', events), events });
    }

    const partner = next.players.find(
      (candidate) =>
        candidate.teamIndex === consultingTeam && candidate.playerId !== player.playerId,
    );
    if (!partner) return err('INVALID_ACTION');
    if (partner.musSaid === true || partner.musDelegated) {
      return ok({ state: completeOnlineTeamMus(next, consultingTeam, events), events });
    }
    return ok({ state: next, events });
  }

  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');

  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');

  const next = bump(state);
  const player = next.players[seat];
  if (!player) return err('INVALID_ACTION');
  player.musSaid = wantsMus;
  events.push({ t: 'musSaid', playerId, mus: wantsMus });

  // "En cuanto uno corta, se acabó el mus para esa mano" (§12.5.3).
  if (!wantsMus) return ok({ state: beginLance(next, 'grande', events), events });

  const pending = seatsFromMano(next).find((s) => next.players[s]?.musSaid === null);
  if (pending !== undefined) {
    next.turnSeat = pending;
    return ok({ state: next, events });
  }

  // Los cuatro dijeron mus: hay descarte (§12.5.2).
  next.phase = 'descarte';
  next.turnSeat = next.manoSeat;
  for (const p of next.players) p.discarded = false;
  return ok({ state: next, events });
}

function applyDescartar(
  state: MusState,
  playerId: PlayerId,
  cardIds: string[],
  events: GameEvent[],
): Result<{ state: MusState; events: GameEvent[] }> {
  if (state.status !== 'playing') return err('INVALID_ACTION');
  if (state.phase !== 'descarte') return err('INVALID_ACTION');
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');

  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const player = state.players[seat];
  if (!player) return err('INVALID_ACTION');

  // De 1 a 4 cartas, nunca 0 (§12.5.2), y sin repetir.
  if (cardIds.length < 1 || cardIds.length > MUS_HAND_SIZE) return err('MUST_DISCARD_AT_LEAST_ONE');
  if (new Set(cardIds).size !== cardIds.length) return err('INVALID_ACTION');
  for (const id of cardIds) {
    if (!player.hand.includes(id)) return err('CARD_NOT_IN_HAND');
  }

  const next = bump(state);
  const np = next.players[seat];
  if (!np) return err('INVALID_ACTION');
  np.hand = np.hand.filter((c) => !cardIds.includes(c));
  next.discardPile = [...next.discardPile, ...cardIds];
  for (let i = 0; i < cardIds.length; i++) {
    const drawn = drawOne(next);
    if (drawn !== null) np.hand.push(drawn);
  }
  np.discarded = true;
  events.push({ t: 'descarte', playerId, count: cardIds.length });

  const pending = seatsFromMano(next).find((s) => next.players[s]?.discarded === false);
  if (pending !== undefined) {
    next.turnSeat = pending;
    return ok({ state: next, events });
  }

  // "Vuelve a empezar el punto 1": otra vuelta de mus (§12.5.2).
  for (const p of next.players) {
    p.discarded = false;
  }
  beginMusRound(next);
  return ok({ state: next, events });
}

// ---------------------------------------------------------------------------
// Lances y envites (§12.6, §12.7, §12.8)
// ---------------------------------------------------------------------------

/**
 * Abre un lance. Puede cerrarlo en el acto sin que nadie hable, en los dos
 * casos de §12.7: nadie tiene pares/juego (el lance no existe) o solo lo
 * tiene una pareja (se lo lleva sin comparación).
 */
function beginLance(s: MusState, lance: MusLance, events: GameEvent[]): MusState {
  clearMusSignals(s);
  s.phase = 'lance';
  s.lance = lance;
  s.bet = null;
  s.spoken = s.players.map(() => false);

  const seats = eligibleSeats(s, lance);

  if (lance === 'pares' || lance === 'juego') {
    if (seats.length === 0) {
      s.lances.push({ lance, outcome: 'skipped', piedras: 0, team: null, paid: false });
      return afterLance(s, lance, events);
    }
    const first = seats[0];
    const onlyOneTeam =
      first !== undefined && seats.every((x) => teamOfSeat(x) === teamOfSeat(first));
    if (onlyOneTeam) {
      s.lances.push({
        lance,
        outcome: 'soloUna',
        piedras: 1,
        team: teamOfSeat(first),
        paid: false,
      });
      return afterLance(s, lance, events);
    }
  }

  events.push({ t: 'lanceStarted', lance });
  s.turnSeat = seats[0] ?? null;
  return s;
}

/** Publica de una vez la verdad que ya conoce el motor por las cuatro manos. */
function declareAutomatically(
  state: MusState,
  which: 'pares' | 'juego',
  events: GameEvent[],
): void {
  for (const player of state.players) {
    const tiene =
      !player.left &&
      (which === 'pares'
        ? paresOf(player.hand, state.config.ochoReyes) !== null
        : tieneJuego(juegoSuma(player.hand)));
    if (which === 'pares') player.paresDeclared = tiene;
    else player.juegoDeclared = tiene;
    events.push({ t: 'declaracion', playerId: player.playerId, lance: which, tiene });
  }
}

/** Pasa al siguiente paso de la mano tras cerrarse un lance (§12.6). */
function afterLance(s: MusState, lance: MusLance, events: GameEvent[]): MusState {
  if (lance === 'grande') return beginLance(s, 'chica', events);
  if (lance === 'chica') {
    declareAutomatically(s, 'pares', events);
    return beginLance(s, 'pares', events);
  }
  if (lance === 'pares') {
    declareAutomatically(s, 'juego', events);
    const hayJuego = s.players.some((player) => !player.left && player.juegoDeclared === true);
    return beginLance(s, hayJuego ? 'juego' : 'punto', events);
  }
  // juego o punto: era el último lance, toca el recuento (§12.9).
  return finishHand(s, events);
}

/** Siguiente asiento de la pareja contraria que juegue este lance (§12.7). */
function nextEligibleOpponent(
  s: MusState,
  lance: MusLance,
  fromSeat: number,
  team: 0 | 1,
): number | null {
  const seats = eligibleSeats(s, lance);
  const n = s.players.length;
  for (let i = 1; i <= n; i++) {
    const cand = (fromSeat - i + n) % n;
    if (seats.includes(cand) && teamOfSeat(cand) !== team) return cand;
  }
  return null;
}

function applyPaso(
  state: MusState,
  playerId: PlayerId,
  events: GameEvent[],
): Result<{ state: MusState; events: GameEvent[] }> {
  if (state.status !== 'playing') return err('INVALID_ACTION');
  if (state.phase !== 'lance' || state.lance === null) return err('INVALID_ACTION');
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');
  // Con un envite sobre la mesa no se pasa: hay que querer, no querer, subir
  // o echar un órdago (§12.7).
  if (state.bet !== null) return err('INVALID_ACTION');

  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const lance = state.lance;

  const next = bump(state);
  next.spoken[seat] = true;

  const pending = eligibleSeats(next, lance).find((s) => next.spoken[s] !== true);
  if (pending !== undefined) {
    next.turnSeat = pending;
    return ok({ state: next, events });
  }

  // Pasaron todos: el lance queda "en paso" y vale 1 piedra al ganador de la
  // comparación, que se decide en el recuento (§12.7).
  next.lances.push({ lance, outcome: 'paso', piedras: 1, team: null, paid: false });
  return ok({ state: afterLance(next, lance, events), events });
}

function applyEnvidar(
  state: MusState,
  playerId: PlayerId,
  piedras: number,
  isOrdago: boolean,
  events: GameEvent[],
): Result<{ state: MusState; events: GameEvent[] }> {
  if (state.status !== 'playing') return err('INVALID_ACTION');
  if (state.phase !== 'lance' || state.lance === null) return err('INVALID_ACTION');
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');

  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const player = state.players[seat];
  if (!player) return err('INVALID_ACTION');
  const lance = state.lance;

  // En pares y juego solo envida quien el motor haya calculado que tiene (§12.7).
  if (lance === 'pares' && player.paresDeclared !== true) return err('CANNOT_BID_WITHOUT_PARES');
  if (lance === 'juego' && player.juegoDeclared !== true) return err('CANNOT_BID_WITHOUT_JUEGO');

  const bet = state.bet;
  // Sobre un órdago solo se puede querer o no querer (§12.8).
  if (bet?.isOrdago) return err('INVALID_ACTION');
  // El compañero de quien envidó no puede subir hasta que responda la
  // contraria (§12.7).
  if (bet && bet.byTeam === player.teamIndex) return err('NOT_YOUR_TEAM_TURN');

  if (!isOrdago) {
    const min = bet ? bet.piedras + 1 : 2;
    if (!Number.isInteger(piedras) || piedras < min) return err('BET_TOO_LOW');
  }

  const next = bump(state);
  next.bet = {
    piedras: isOrdago ? 0 : piedras,
    byTeam: player.teamIndex,
    ifRejected: bet ? bet.piedras : 1,
    isOrdago,
  };
  events.push(isOrdago ? { t: 'ordago', playerId } : { t: 'envido', playerId, piedras });

  next.turnSeat = nextEligibleOpponent(next, lance, seat, player.teamIndex);
  return ok({ state: next, events });
}

function applyQuerer(
  state: MusState,
  playerId: PlayerId,
  events: GameEvent[],
): Result<{ state: MusState; events: GameEvent[] }> {
  if (state.status !== 'playing') return err('INVALID_ACTION');
  if (state.phase !== 'lance' || state.lance === null) return err('INVALID_ACTION');
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');

  const bet = state.bet;
  if (!bet) return err('INVALID_ACTION');
  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const player = state.players[seat];
  if (!player) return err('INVALID_ACTION');
  if (player.teamIndex === bet.byTeam) return err('NOT_YOUR_TEAM_TURN');

  const lance = state.lance;
  const next = bump(state);
  next.bet = null;
  events.push({ t: 'querido', playerId });

  if (bet.isOrdago) {
    // Se descubren las cartas de los cuatro y se resuelve ESE lance en el
    // acto: quien lo gane gana el juego entero, sea cual sea el tanteo (§12.8).
    const winner = lanceWinnerSeat(next, lance, eligibleSeats(next, lance));
    const winTeam = winner !== null ? teamOfSeat(winner) : bet.byTeam;
    next.lances.push({ lance, outcome: 'querido', piedras: 0, team: winTeam, paid: true });
    return ok({ state: finishHandByOrdago(next, winTeam, events), events });
  }

  next.lances.push({ lance, outcome: 'querido', piedras: bet.piedras, team: null, paid: false });
  return ok({ state: afterLance(next, lance, events), events });
}

function applyNoQuerer(
  state: MusState,
  playerId: PlayerId,
  events: GameEvent[],
): Result<{ state: MusState; events: GameEvent[] }> {
  if (state.status !== 'playing') return err('INVALID_ACTION');
  if (state.phase !== 'lance' || state.lance === null) return err('INVALID_ACTION');
  if (!isPlayerTurn(state, playerId)) return err('NOT_YOUR_TURN');

  const bet = state.bet;
  if (!bet) return err('INVALID_ACTION');
  const seat = state.turnSeat;
  if (seat === null) return err('INVALID_ACTION');
  const player = state.players[seat];
  if (!player) return err('INVALID_ACTION');
  if (player.teamIndex === bet.byTeam) return err('NOT_YOUR_TEAM_TURN');

  const lance = state.lance;
  const next = bump(state);
  next.bet = null;
  events.push({ t: 'noQuerido', playerId });

  // Órdago no querido: 1 piedra a quien lo echó y la mano sigue (§12.8).
  // Envite normal no querido: quien envidó se lleva lo acumulado ANTES del
  // último envite (§12.7). En los dos casos se paga en el acto.
  const amount = bet.isOrdago ? 1 : bet.ifRejected;
  next.lances.push({ lance, outcome: 'noQuerido', piedras: amount, team: bet.byTeam, paid: true });
  addPiedras(next, bet.byTeam, amount);

  // Llegar a 40 termina el juego donde sea que pase (§12.9.3): los lances que
  // faltaban no se juegan.
  if (juegoDecided(next)) return ok({ state: finishHand(next, events), events });

  return ok({ state: afterLance(next, lance, events), events });
}

// ---------------------------------------------------------------------------
// Fin de mano, fin de juego y fin de partida (§12.3, §12.9)
// ---------------------------------------------------------------------------

function finishHand(s: MusState, events: GameEvent[]): MusState {
  s.phase = 'recuento';
  s.lance = null;
  s.turnSeat = null;
  s.bet = null;
  s.handResult = runRecuento(s);
  events.push({ t: 'handScored', piedras: [...s.piedras] });
  return closeHand(s, s.handResult.juegoWonByTeam, events);
}

function finishHandByOrdago(s: MusState, winTeam: 0 | 1, events: GameEvent[]): MusState {
  s.phase = 'recuento';
  s.lance = null;
  s.turnSeat = null;
  s.bet = null;
  s.piedras[winTeam] = MUS_META;
  s.handResult = {
    hands: s.players.map((p) => [...p.hand]),
    // Un órdago querido no lleva recuento: se resuelve solo ese lance (§12.8),
    // así que los lances anteriores quedan sin contar.
    rows: s.lances.map((ls) => ({
      lance: ls.lance,
      outcome: ls.outcome,
      wonByTeam: ls.paid ? ls.team : null,
      piedras: ls.paid ? ls.piedras : 0,
      tablas: [0, 0],
      counted: ls.paid,
    })),
    piedras: [...s.piedras],
    juegoWonByTeam: winTeam,
    byOrdago: true,
  };
  events.push({ t: 'handScored', piedras: [...s.piedras] });
  return closeHand(s, winTeam, events);
}

/** Contabilidad de juegos y de partida, común al recuento y al órdago (§12.3). */
function closeHand(s: MusState, wonTeam: 0 | 1 | null, events: GameEvent[]): MusState {
  s.rematchVotes = [];

  if (wonTeam !== null) {
    s.juegosWon[wonTeam] = (s.juegosWon[wonTeam] ?? 0) + 1;
    events.push({ t: 'juegoWon', teamIndex: wonTeam });
    if ((s.juegosWon[wonTeam] ?? 0) >= s.config.juegos) {
      s.status = 'gameEnd';
      s.winnerTeamIndex = wonTeam;
      events.push({ t: 'gameOverTeam', teamIndex: wonTeam });
      return s;
    }
  }

  s.status = 'roundEnd';
  return s;
}

// ---------------------------------------------------------------------------
// nextRound: confirmar el recuento y preparar el reparto siguiente
// ---------------------------------------------------------------------------

function applyNextRound(
  state: MusState,
  playerId: PlayerId,
  events: GameEvent[],
): Result<{ state: MusState; events: GameEvent[] }> {
  if (state.status !== 'roundEnd') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');

  const next = bump(state);
  if (!next.rematchVotes.includes(playerId)) next.rematchVotes.push(playerId);

  const actives = next.players.filter((p) => !p.left);
  if (!actives.every((p) => next.rematchVotes.includes(p.playerId))) {
    return ok({ state: next, events });
  }

  next.rematchVotes = [];

  // Si la mano anterior cerró un juego, empieza otro de cero (§12.3, vaca).
  if (next.handResult?.juegoWonByTeam != null) {
    next.juegoNumber += 1;
    next.piedras = [0, 0];
    next.handNumber = 1;
  } else {
    next.handNumber += 1;
  }

  next.manoSeat = (next.manoSeat - 1 + next.players.length) % next.players.length; // rota a la derecha (§12.4)
  next.status = 'playing';
  next.handResult = null;
  next.phase = 'reparto';
  next.turnSeat = postreSeat(next);
  next.deck = [];
  next.discardPile = [];
  next.lance = null;
  next.bet = null;
  next.lances = [];
  next.spoken = next.players.map(() => false);
  next.musConsultingTeam = null;
  for (const p of next.players) {
    p.hand = [];
    p.musSaid = null;
    p.musSignal = null;
    p.musDelegated = false;
    p.discarded = false;
    p.paresDeclared = null;
    p.juegoDeclared = null;
  }

  return ok({ state: next, events });
}
