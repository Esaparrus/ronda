import {
  SUITS,
  err,
  ok,
  parseCardId,
  type CardId,
  type ClassicConfig,
  type ClassicGameId,
  type GameAction,
  type GameEvent,
  type PlayerId,
  type Result,
  type Suit,
} from '@ronda/protocol';
import { buildDeck } from '../../core/deck.ts';
import { shuffle } from '../../core/rng.ts';
import { resolveTrick } from '../pocha/trick.ts';
import { cinquilloLegal, escobaValue, sevenHalfTotal, trickPoints } from './rules.ts';
import {
  findPlayer,
  nextActiveSeat,
  seatAtTurnOffset,
  type ClassicPlayer,
  type ClassicState,
} from './state.ts';

function cloneState(state: ClassicState): ClassicState {
  return {
    ...state,
    rng: { ...state.rng },
    deck: [...state.deck],
    currentTrick: state.currentTrick.map((card) => ({ ...card })),
    tableCards: [...state.tableCards],
    players: state.players.map((player) => ({
      ...player,
      hand: [...player.hand],
      captured: [...player.captured],
      sungSuits: [...player.sungSuits],
    })),
    rematchVotes: [...state.rematchVotes],
  };
}

function shuffledDeck(state: ClassicState): CardId[] {
  const shuffled = shuffle(
    buildDeck().map((card) => card.id),
    state.rng.seed,
    state.rng.calls,
  );
  state.rng.calls = shuffled.calls;
  return shuffled.items;
}

function emptyPlayer(input: { playerId: PlayerId; nick: string; seat: number }): ClassicPlayer {
  return {
    ...input,
    score: 0,
    left: false,
    hand: [],
    captured: [],
    escobas: 0,
    stood: false,
    bust: false,
    revealed: false,
    bonus: 0,
    sungSuits: [],
  };
}

function take(state: ClassicState): CardId | null {
  return state.deck.shift() ?? null;
}

function dealOneEach(state: ClassicState, count: number, firstSeat: number): void {
  for (let card = 0; card < count; card++) {
    for (let offset = 0; offset < state.players.length; offset++) {
      const seat = seatAtTurnOffset(state, firstSeat, offset);
      const drawn = take(state);
      if (drawn) state.players[seat]?.hand.push(drawn);
    }
  }
}

export function createClassicState(
  input: {
    config: ClassicConfig;
    players: { playerId: PlayerId; nick: string; seat: number }[];
    seed: string;
    roomCode?: string;
  },
  gameId: ClassicGameId,
): ClassicState {
  if (input.config.gameId !== gameId)
    throw new Error(`Config ${input.config.gameId} no corresponde a ${gameId}`);
  const state: ClassicState = {
    version: 0,
    status: 'playing',
    phase:
      gameId === 'escoba'
        ? 'capture'
        : gameId === 'sieteymedia'
          ? 'draw'
          : gameId === 'cinquillo'
            ? 'layout'
            : 'trick',
    config: input.config,
    gameId,
    roomCode: input.roomCode ?? '',
    rng: { seed: input.seed, calls: 0 },
    round: 1,
    dealerSeat: 0,
    bankerSeat: gameId === 'sieteymedia' ? 0 : null,
    turnSeat: null,
    deck: [],
    trumpCardId: null,
    trumpSuit: null,
    currentTrick: [],
    tableCards: [],
    lastCapturerSeat: null,
    players: [...input.players].sort((a, b) => a.seat - b.seat).map(emptyPlayer),
    winnerId: null,
    rematchVotes: [],
  };

  state.deck = shuffledDeck(state);
  // A tres, Brisca retira una carta blanca para que todos jueguen el mismo
  // número de bazas (39 cartas). No altera los 120 tantos disponibles.
  if (gameId === 'brisca' && state.players.length === 3) {
    state.deck = state.deck.filter((cardId) => cardId !== 'oros-2');
  }
  const firstSeat = nextActiveSeat(state, state.dealerSeat) ?? 0;

  if (gameId === 'brisca' || gameId === 'tute') {
    dealOneEach(state, gameId === 'brisca' ? 3 : 8, firstSeat);
    const trump = state.deck[state.deck.length - 1] ?? null;
    state.trumpCardId = trump;
    const parsed = trump ? parseCardId(trump) : null;
    state.trumpSuit = parsed?.ok ? parsed.value.suit : null;
    state.turnSeat = firstSeat;
  } else if (gameId === 'escoba') {
    dealOneEach(state, 3, firstSeat);
    state.tableCards = state.deck.splice(0, 4);
    state.turnSeat = firstSeat;
    if (state.tableCards.reduce((sum, cardId) => sum + escobaValue(cardId), 0) === 15) {
      const dealer = state.players[state.dealerSeat];
      if (dealer) {
        dealer.captured.push(...state.tableCards);
        dealer.escobas += 1;
        state.lastCapturerSeat = dealer.seat;
        state.tableCards = [];
      }
    }
  } else if (gameId === 'sieteymedia') {
    dealSieteRound(state, 0);
  } else {
    dealAllForCinquillo(state, firstSeat);
  }

  return state;
}

function dealAllForCinquillo(state: ClassicState, firstSeat: number): void {
  let seat = firstSeat;
  while (state.deck.length > 0) {
    const card = take(state);
    if (card) state.players[seat]?.hand.push(card);
    seat = nextActiveSeat(state, seat) ?? firstSeat;
  }
  state.turnSeat =
    state.players.find((player) => player.hand.includes('oros-5'))?.seat ?? firstSeat;
}

function dealSieteRound(state: ClassicState, bankerSeat: number): void {
  state.deck = shuffledDeck(state);
  state.bankerSeat = bankerSeat;
  state.dealerSeat = bankerSeat;
  state.phase = 'draw';
  state.currentTrick = [];
  state.tableCards = [];
  for (const player of state.players) {
    player.hand = [];
    player.captured = [];
    player.stood = false;
    player.bust = false;
    player.revealed = false;
  }
  const first = nextActiveSeat(state, bankerSeat) ?? bankerSeat;
  dealOneEach(state, 1, first);
  state.turnSeat = first;
}

export function applyClassicAction(
  state: ClassicState,
  playerId: PlayerId,
  action: GameAction,
  _now: number,
): Result<{ state: ClassicState; events: GameEvent[] }> {
  if (state.status === 'roundEnd') {
    if (state.gameId !== 'sieteymedia' || action.type !== 'nextRound') {
      return err('INVALID_ACTION');
    }
    return confirmSevenHalfRound(state, playerId);
  }
  if (state.status !== 'playing') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player || player.left) return err('PLAYER_NOT_IN_ROOM');
  if (state.turnSeat !== player.seat) return err('NOT_YOUR_TURN');

  if (state.gameId === 'brisca' || state.gameId === 'tute') {
    if (action.type !== 'playCard') return err('INVALID_ACTION');
    return playTrickCard(state, player, action.cardId);
  }
  if (state.gameId === 'escoba') {
    if (action.type !== 'playCapture') return err('INVALID_ACTION');
    return playEscoba(state, player, action.cardId, action.captureIds);
  }
  if (state.gameId === 'sieteymedia') {
    if (action.type === 'drawDeck') return drawSevenHalf(state, player);
    if (action.type === 'stand') return standSevenHalf(state, player);
    return err('INVALID_ACTION');
  }
  if (action.type === 'playCard') return playCinquillo(state, player, action.cardId);
  if (action.type === 'pass') return passCinquillo(state, player);
  return err('INVALID_ACTION');
}

function legalTrickCards(state: ClassicState, player: ClassicPlayer): CardId[] {
  if (state.gameId !== 'tute' || state.deck.length > 0 || state.currentTrick.length === 0) {
    return [...player.hand];
  }
  const leadCard = state.currentTrick[0];
  const parsedLead = leadCard ? parseCardId(leadCard.cardId) : null;
  if (!parsedLead?.ok) return [...player.hand];
  const matching = player.hand.filter((cardId) => {
    const parsed = parseCardId(cardId);
    return parsed.ok && parsed.value.suit === parsedLead.value.suit;
  });
  return matching.length > 0 ? matching : [...player.hand];
}

function playTrickCard(
  state: ClassicState,
  player: ClassicPlayer,
  cardId: CardId,
): Result<{ state: ClassicState; events: GameEvent[] }> {
  if (!player.hand.includes(cardId)) return err('CARD_NOT_IN_HAND');
  if (!legalTrickCards(state, player).includes(cardId)) return err('MUST_FOLLOW_SUIT');
  const next = cloneState(state);
  const current = next.players[player.seat];
  if (!current) return err('PLAYER_NOT_IN_ROOM');
  current.hand = current.hand.filter((id) => id !== cardId);
  next.currentTrick.push({ seat: current.seat, cardId });
  next.version += 1;
  const events: GameEvent[] = [{ t: 'cardPlayed', playerId: current.playerId, cardId }];

  if (next.currentTrick.length < next.players.filter((candidate) => !candidate.left).length) {
    next.turnSeat = nextActiveSeat(next, current.seat);
    return ok({ state: next, events });
  }

  const lead = next.currentTrick[0];
  const leadParsed = lead ? parseCardId(lead.cardId) : null;
  if (!leadParsed?.ok) return err('INTERNAL');
  const winnerSeat = resolveTrick(
    next.currentTrick,
    leadParsed.value.suit,
    next.trumpSuit,
    'brisca',
  );
  const winner = next.players[winnerSeat];
  if (!winner) return err('INTERNAL');
  const wonCards = next.currentTrick.map((card) => card.cardId);
  winner.captured.push(...wonCards);
  next.currentTrick = [];
  events.push({ t: 'trickWon', playerId: winner.playerId, cards: wonCards });

  drawAfterTrick(next, winnerSeat);
  if (next.gameId === 'tute') autoSing(next, winner);
  if (next.deck.length === 0 && next.players.every((candidate) => candidate.hand.length === 0)) {
    finishTrickGame(next, winnerSeat);
    if (next.winnerId) events.push({ t: 'gameOver', winnerId: next.winnerId });
  } else {
    next.turnSeat = winnerSeat;
  }
  return ok({ state: next, events });
}

function drawAfterTrick(state: ClassicState, winnerSeat: number): void {
  let seat = winnerSeat;
  for (let i = 0; i < state.players.length && state.deck.length > 0; i++) {
    const card = take(state);
    if (card) {
      state.players[seat]?.hand.push(card);
      if (card === state.trumpCardId) state.trumpCardId = null;
    }
    seat = nextActiveSeat(state, seat) ?? winnerSeat;
  }
}

function autoSing(state: ClassicState, player: ClassicPlayer): void {
  for (const suit of [state.trumpSuit, ...SUITS] as (Suit | null)[]) {
    if (!suit || player.sungSuits.includes(suit)) continue;
    if (player.hand.includes(`${suit}-12`) && player.hand.includes(`${suit}-11`)) {
      player.sungSuits.push(suit);
      player.bonus += suit === state.trumpSuit ? 40 : 20;
      return;
    }
  }
}

function finishTrickGame(state: ClassicState, lastWinnerSeat: number): void {
  for (const player of state.players) {
    player.score =
      player.captured.reduce((sum, cardId) => sum + trickPoints(cardId), 0) + player.bonus;
    player.revealed = true;
  }
  if (state.gameId === 'tute') {
    const lastWinner = state.players[lastWinnerSeat];
    if (lastWinner) lastWinner.score += 10;
  }
  finishWithHighestScore(state);
}

function playEscoba(
  state: ClassicState,
  player: ClassicPlayer,
  cardId: CardId,
  captureIds: CardId[],
): Result<{ state: ClassicState; events: GameEvent[] }> {
  if (!player.hand.includes(cardId)) return err('CARD_NOT_IN_HAND');
  if (new Set(captureIds).size !== captureIds.length) return err('INVALID_ACTION');
  if (captureIds.some((id) => !state.tableCards.includes(id))) return err('INVALID_ACTION');
  if (
    captureIds.length > 0 &&
    escobaValue(cardId) + captureIds.reduce((sum, id) => sum + escobaValue(id), 0) !== 15
  ) {
    return err('INVALID_ACTION');
  }

  const next = cloneState(state);
  const current = next.players[player.seat];
  if (!current) return err('PLAYER_NOT_IN_ROOM');
  current.hand = current.hand.filter((id) => id !== cardId);
  if (captureIds.length > 0) {
    const selected = new Set(captureIds);
    current.captured.push(cardId, ...captureIds);
    next.tableCards = next.tableCards.filter((id) => !selected.has(id));
    next.lastCapturerSeat = current.seat;
    if (next.tableCards.length === 0) current.escobas += 1;
  } else {
    next.tableCards.push(cardId);
  }
  next.version += 1;
  const events: GameEvent[] = [{ t: 'cardPlayed', playerId: current.playerId, cardId }];
  const followingSeat = nextActiveSeat(next, current.seat) ?? current.seat;

  if (next.players.every((candidate) => candidate.hand.length === 0)) {
    if (next.deck.length > 0) {
      dealOneEach(next, 3, nextActiveSeat(next, next.dealerSeat) ?? 0);
      next.turnSeat = followingSeat;
    } else {
      finishEscoba(next);
      if (next.winnerId) events.push({ t: 'gameOver', winnerId: next.winnerId });
    }
  } else {
    next.turnSeat = followingSeat;
  }
  return ok({ state: next, events });
}

function majorityWinners(
  players: ClassicPlayer[],
  score: (player: ClassicPlayer) => number,
): ClassicPlayer[] {
  const maximum = Math.max(...players.map(score));
  const winners = players.filter((player) => score(player) === maximum);
  return winners.length === 1 ? winners : [];
}

function finishEscoba(state: ClassicState): void {
  const receiver = state.players[state.lastCapturerSeat ?? state.dealerSeat];
  if (receiver) receiver.captured.push(...state.tableCards);
  state.tableCards = [];
  for (const player of state.players) player.score = player.escobas;
  const metrics = [
    (player: ClassicPlayer) => player.captured.length,
    (player: ClassicPlayer) => player.captured.filter((id) => id.startsWith('oros-')).length,
    (player: ClassicPlayer) => player.captured.filter((id) => id.endsWith('-7')).length,
  ];
  for (const metric of metrics) {
    for (const winner of majorityWinners(state.players, metric)) winner.score += 1;
  }
  for (const player of state.players) {
    if (player.captured.includes('oros-7')) player.score += 1;
    player.revealed = true;
  }
  finishWithHighestScore(state);
}

function drawSevenHalf(
  state: ClassicState,
  player: ClassicPlayer,
): Result<{ state: ClassicState; events: GameEvent[] }> {
  const next = cloneState(state);
  const current = next.players[player.seat];
  const card = take(next);
  if (!current || !card) return err('INVALID_ACTION');
  current.hand.push(card);
  next.version += 1;
  const total = sevenHalfTotal(current.hand);
  if (total >= 7.5) {
    current.stood = total === 7.5;
    current.bust = total > 7.5;
    current.revealed = true;
    advanceSevenHalf(next, current.seat);
  }
  const events: GameEvent[] = [{ t: 'drewDeck', playerId: current.playerId }];
  if (next.status === 'gameEnd' && next.winnerId)
    events.push({ t: 'gameOver', winnerId: next.winnerId });
  return ok({ state: next, events });
}

function standSevenHalf(
  state: ClassicState,
  player: ClassicPlayer,
): Result<{ state: ClassicState; events: GameEvent[] }> {
  const next = cloneState(state);
  const current = next.players[player.seat];
  if (!current) return err('PLAYER_NOT_IN_ROOM');
  current.stood = true;
  current.revealed = true;
  next.version += 1;
  advanceSevenHalf(next, current.seat);
  const events: GameEvent[] = [];
  if (next.status === 'gameEnd' && next.winnerId)
    events.push({ t: 'gameOver', winnerId: next.winnerId });
  return ok({ state: next, events });
}

function advanceSevenHalf(state: ClassicState, fromSeat: number): void {
  const bankerSeat = state.bankerSeat ?? 0;
  if (fromSeat === bankerSeat) {
    scoreSevenHalfRound(state);
    return;
  }
  for (let offset = 1; offset <= state.players.length; offset++) {
    const seat = seatAtTurnOffset(state, fromSeat, offset);
    if (seat === bankerSeat) continue;
    const candidate = state.players[seat];
    if (candidate && !candidate.left && !candidate.stood && !candidate.bust) {
      state.turnSeat = seat;
      return;
    }
  }
  state.phase = 'banker';
  state.turnSeat = bankerSeat;
}

function scoreSevenHalfRound(state: ClassicState): void {
  const bankerSeat = state.bankerSeat ?? 0;
  const banker = state.players[bankerSeat];
  if (!banker) return;
  const bankerTotal = sevenHalfTotal(banker.hand);
  const rows: { playerId: PlayerId; delta: number; total: number }[] = [];
  for (const player of state.players) {
    let delta = 0;
    if (player.seat !== bankerSeat) {
      const total = sevenHalfTotal(player.hand);
      if (!player.bust && (banker.bust || total > bankerTotal)) {
        player.score += 1;
        delta = 1;
      } else {
        banker.score += 1;
      }
    }
    rows.push({ playerId: player.playerId, delta, total: player.score });
  }
  banker.revealed = true;
  if (state.round >= state.players.length) {
    finishWithHighestScore(state);
    return;
  }
  state.status = 'roundEnd';
  state.phase = 'banker';
  state.turnSeat = null;
}

function confirmSevenHalfRound(
  state: ClassicState,
  playerId: PlayerId,
): Result<{ state: ClassicState; events: GameEvent[] }> {
  const player = findPlayer(state, playerId);
  if (!player || player.left) return err('PLAYER_NOT_IN_ROOM');

  const next = cloneState(state);
  next.version += 1;
  if (!next.rematchVotes.includes(playerId)) next.rematchVotes.push(playerId);

  const activePlayers = next.players.filter((candidate) => !candidate.left);
  if (!activePlayers.every((candidate) => next.rematchVotes.includes(candidate.playerId))) {
    return ok({ state: next, events: [] });
  }

  const bankerSeat = next.bankerSeat ?? 0;
  next.rematchVotes = [];
  next.round += 1;
  next.status = 'playing';
  dealSieteRound(next, nextActiveSeat(next, bankerSeat) ?? bankerSeat);
  return ok({ state: next, events: [{ t: 'dealt', round: next.round }] });
}

function playCinquillo(
  state: ClassicState,
  player: ClassicPlayer,
  cardId: CardId,
): Result<{ state: ClassicState; events: GameEvent[] }> {
  if (!player.hand.includes(cardId)) return err('CARD_NOT_IN_HAND');
  if (!cinquilloLegal(player.hand, state.tableCards).includes(cardId)) return err('INVALID_ACTION');
  const next = cloneState(state);
  const current = next.players[player.seat];
  if (!current) return err('PLAYER_NOT_IN_ROOM');
  current.hand = current.hand.filter((id) => id !== cardId);
  next.tableCards.push(cardId);
  next.version += 1;
  const events: GameEvent[] = [{ t: 'cardPlayed', playerId: current.playerId, cardId }];
  if (current.hand.length === 0) {
    current.score = 1;
    current.revealed = true;
    finishWithHighestScore(next);
    if (next.winnerId) events.push({ t: 'gameOver', winnerId: next.winnerId });
  } else {
    next.turnSeat = nextActiveSeat(next, current.seat);
  }
  return ok({ state: next, events });
}

function passCinquillo(
  state: ClassicState,
  player: ClassicPlayer,
): Result<{ state: ClassicState; events: GameEvent[] }> {
  if (cinquilloLegal(player.hand, state.tableCards).length > 0) return err('INVALID_ACTION');
  const next = cloneState(state);
  next.version += 1;
  next.turnSeat = nextActiveSeat(next, player.seat);
  return ok({ state: next, events: [] });
}

function finishWithHighestScore(state: ClassicState): void {
  const ordered = [...state.players].sort((a, b) => b.score - a.score || a.seat - b.seat);
  state.status = 'gameEnd';
  state.turnSeat = null;
  state.winnerId = ordered[0]?.playerId ?? null;
  for (const player of state.players) player.revealed = true;
}

export function legalCardsFor(state: ClassicState, player: ClassicPlayer): CardId[] {
  if (state.gameId === 'cinquillo') return cinquilloLegal(player.hand, state.tableCards);
  if (state.gameId === 'brisca' || state.gameId === 'tute') return legalTrickCards(state, player);
  return [...player.hand];
}
