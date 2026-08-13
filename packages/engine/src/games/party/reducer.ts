// Reducer puro de Orden, Colores, Mayoría y Escala.
//
// Todas las decisiones que pueden afectar al resultado pasan por aquí. El
// servidor serializa las llamadas y además exige expectedVersion; por eso una
// segunda jugada simultánea de Orden llega con una versión vieja y no puede
// convertirse en otra primera carta válida.

import {
  type CardId,
  type GameAction,
  type GameEvent,
  type PartyGameId,
  type PlayerId,
  type Result,
  err,
  ok,
} from '@ronda/protocol';
import { shuffle } from '../../core/rng.ts';
import type { CreateInitialStateInput } from '../../core/types.ts';
import { COLOR_NAMES, colorDistance, colorQuestionById } from './content.ts';
import {
  activePlayers,
  findPlayer,
  partyConfigForGame,
  questionIdsFor,
  type ColorsRoundState,
  type MajorityRoundState,
  type PartyPlayer,
  type PartyState,
  type ScaleRoundState,
} from './state.ts';

type PartyActionResult = Result<{ state: PartyState; events: GameEvent[] }>;

function cloneRecord<T>(record: Record<PlayerId, T>, cloneValue: (value: T) => T): Record<PlayerId, T> {
  return Object.fromEntries(
    Object.entries(record).map(([playerId, value]) => [playerId, cloneValue(value)]),
  ) as Record<PlayerId, T>;
}

function cloneState(state: PartyState): PartyState {
  return {
    ...state,
    rng: { ...state.rng },
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    order: state.order
      ? {
          ...state.order,
          played: state.order.played.map((played) => ({ ...played })),
          failure: state.order.failure ? { ...state.order.failure } : null,
          numberDeck: [...state.order.numberDeck],
        }
      : null,
    colors: state.colors
      ? {
          ...state.colors,
          questionOrder: [...state.colors.questionOrder],
          submissions: cloneRecord(state.colors.submissions, (colors) => [...colors]),
        }
      : null,
    majority: state.majority
      ? {
          ...state.majority,
          questionOrder: [...state.majority.questionOrder],
          submissions: { ...state.majority.submissions },
          majorityAnswers: state.majority.majorityAnswers
            ? [...state.majority.majorityAnswers]
            : null,
        }
      : null,
    scale: state.scale
      ? {
          ...state.scale,
          questionOrder: [...state.scale.questionOrder],
          guesses: { ...state.scale.guesses },
        }
      : null,
    rematchVotes: [...state.rematchVotes],
  };
}

function bump(state: PartyState): PartyState {
  const next = cloneState(state);
  next.version = state.version + 1;
  return next;
}

function shuffled<T>(state: PartyState, items: readonly T[]): T[] {
  const result = shuffle(items, state.rng.seed, state.rng.calls);
  state.rng.calls = result.calls;
  return result.items;
}

function randomTarget(state: PartyState): number {
  const values = Array.from({ length: 101 }, (_, value) => value);
  return shuffled(state, values)[0] ?? 50;
}

function dealOrderRound(
  players: readonly PartyPlayer[],
  numberDeck: readonly number[],
  cardsPerPlayer: number,
): { players: PartyPlayer[]; numberDeck: number[] } {
  const nextPlayers: PartyPlayer[] = players.map((player) => ({ ...player, hand: [] }));
  const deck = [...numberDeck];

  for (let card = 0; card < cardsPerPlayer; card++) {
    for (let seat = 0; seat < nextPlayers.length; seat++) {
      const player = nextPlayers[seat];
      const value = deck.shift();
      if (player && value !== undefined) player.hand.push(String(value) as CardId);
    }
  }

  return { players: nextPlayers, numberDeck: deck };
}

function initialPlayers(input: CreateInitialStateInput): PartyPlayer[] {
  return [...input.players]
    .sort((a, b) => a.seat - b.seat)
    .map((player) => ({
      playerId: player.playerId,
      nick: player.nick,
      seat: player.seat,
      score: 0,
      left: false,
      hand: [],
    }));
}

/** Crea el estado inicial de uno de los cuatro modos sociales. */
export function createPartyState(
  input: CreateInitialStateInput & { roomCode?: string },
  gameId: PartyGameId,
): PartyState {
  const config = partyConfigForGame(input.config, gameId);
  const state: PartyState = {
    version: 0,
    status: 'playing',
    phase: 'input',
    config,
    gameId,
    roomCode: input.roomCode ?? '',
    rng: { seed: input.seed, calls: 0 },
    round: 1,
    turnSeat: null,
    players: initialPlayers(input),
    order: null,
    colors: null,
    majority: null,
    scale: null,
    winnerId: null,
    rematchVotes: [],
  };

  if (gameId === 'orden') {
    const orderConfig = config.gameId === 'orden' ? config : null;
    if (!orderConfig) throw new Error('Configuración inválida para Orden');
    const numberDeck = shuffled(
      state,
      Array.from({ length: 100 }, (_, value) => value + 1),
    );
    const dealt = dealOrderRound(state.players, numberDeck, orderConfig.cardsPerPlayer);
    state.players = dealt.players;
    state.order = {
      cardsPerPlayer: orderConfig.cardsPerPlayer,
      nextCardsPerPlayer: Math.min(orderConfig.cardsPerPlayer + 1, 10),
      highest: 0,
      played: [],
      failure: null,
      numberDeck: dealt.numberDeck,
    };
    return state;
  }

  const questionOrder = shuffled(state, questionIdsFor(gameId));
  const questionId = questionOrder[0] ?? '';

  if (gameId === 'colores') {
    state.colors = {
      questionOrder,
      questionIndex: 0,
      questionId,
      submissions: {},
    };
  } else if (gameId === 'mayoria') {
    state.majority = {
      questionOrder,
      questionIndex: 0,
      questionId,
      submissions: {},
      majorityAnswers: null,
    };
  } else {
    const firstPlayer = activePlayers(state)[0];
    if (!firstPlayer) throw new Error('Escala necesita al menos un jugador');
    state.scale = {
      questionOrder,
      questionIndex: 0,
      questionId,
      cluePlayerId: firstPlayer.playerId,
      target: randomTarget(state),
      guesses: {},
    };
  }

  return state;
}

export function applyAction(
  state: PartyState,
  playerId: PlayerId,
  action: GameAction,
  now: number,
): PartyActionResult {
  void now;

  switch (action.type) {
    case 'playNumber':
      return applyPlayNumber(state, playerId, action.value);
    case 'setOrderCards':
      return applySetOrderCards(state, playerId, action.count);
    case 'endOrder':
      return applyEndOrder(state, playerId);
    case 'submitColors':
      return applySubmitColors(state, playerId, action.colors);
    case 'submitMajority':
      return applySubmitMajority(state, playerId, action.answer);
    case 'submitScale':
      return applySubmitScale(state, playerId, action.value);
    case 'nextRound':
      return applyNextRound(state, playerId);
    default:
      return err('INVALID_ACTION');
  }
}

function requireInputPlayer(
  state: PartyState,
  playerId: PlayerId,
): Result<PartyPlayer> {
  if (state.status !== 'playing' || state.phase !== 'input') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  return ok(player);
}

function allSubmitted(state: PartyState, submissions: Record<PlayerId, unknown>): boolean {
  const players = activePlayers(state);
  return players.length > 0 && players.every((player) => submissions[player.playerId] !== undefined);
}

function applyPlayNumber(
  state: PartyState,
  playerId: PlayerId,
  value: number,
): PartyActionResult {
  if (state.gameId !== 'orden' || !state.order) return err('INVALID_ACTION');
  const playerResult = requireInputPlayer(state, playerId);
  if (!playerResult.ok) return playerResult;
  const cardId = String(value) as CardId;
  if (!playerResult.value.hand.includes(cardId)) return err('CARD_NOT_IN_HAND');

  const next = bump(state);
  const player = findPlayer(next, playerId);
  const order = next.order;
  if (!player || !order) return err('INVALID_ACTION');
  player.hand = player.hand.filter((card) => card !== cardId);
  order.played.push({ playerId, value });

  const events: GameEvent[] = [{ t: 'numberPlayed', playerId, value }];
  if (value < order.highest) {
    order.failure = { playerId, value, highest: order.highest };
    order.nextCardsPerPlayer = order.cardsPerPlayer;
    next.phase = 'reveal';
    events.push({ t: 'partyRevealed', gameId: 'orden', round: next.round });
  } else {
    order.highest = value;
    const cleared = activePlayers(next).every((active) => active.hand.length === 0);
    if (cleared) {
      next.phase = 'reveal';
      events.push({ t: 'partyRevealed', gameId: 'orden', round: next.round });
    }
  }

  return ok({ state: next, events });
}

function applySetOrderCards(
  state: PartyState,
  playerId: PlayerId,
  count: number,
): PartyActionResult {
  if (state.gameId !== 'orden' || !state.order) return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player || player.left) return err('PLAYER_NOT_IN_ROOM');
  if (player.seat !== 0) return err('NOT_HOST');
  if (state.status !== 'playing' || state.phase !== 'reveal') return err('INVALID_ACTION');
  if (!Number.isInteger(count) || count < 1 || count > 10) return err('INVALID_ACTION');

  const next = bump(state);
  if (!next.order) return err('INVALID_ACTION');
  next.order.nextCardsPerPlayer = count;
  return ok({ state: next, events: [] });
}

function applyEndOrder(state: PartyState, playerId: PlayerId): PartyActionResult {
  if (state.gameId !== 'orden' || !state.order) return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player || player.left) return err('PLAYER_NOT_IN_ROOM');
  if (player.seat !== 0) return err('NOT_HOST');
  if (state.status !== 'playing' || state.phase !== 'reveal' || !state.order.failure) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  next.status = 'gameEnd';
  next.winnerId = null;
  next.rematchVotes = [];
  return ok({ state: next, events: [] });
}

function canonicalColor(value: string): string | null {
  const normalized = normalizeText(value);
  return COLOR_NAMES.find((color) => normalizeText(color) === normalized) ?? null;
}

function canonicalColors(values: readonly string[]): string[] | null {
  const colors: string[] = [];
  for (const value of values) {
    const color = canonicalColor(value);
    if (!color || colors.includes(color)) return null;
    colors.push(color);
  }
  return colors;
}

function applySubmitColors(
  state: PartyState,
  playerId: PlayerId,
  values: readonly string[],
): PartyActionResult {
  if (state.gameId !== 'colores' || !state.colors) return err('INVALID_ACTION');
  const playerResult = requireInputPlayer(state, playerId);
  if (!playerResult.ok) return playerResult;
  const colors = canonicalColors(values);
  const question = colorQuestionById(state.colors.questionId);
  if (!colors || colors.length === 0 || (!question.allowMultiple && colors.length !== 1)) {
    return err('INVALID_ACTION');
  }
  if (state.colors.submissions[playerId] !== undefined) return err('INVALID_ACTION');

  const next = bump(state);
  const round = next.colors;
  if (!round) return err('INVALID_ACTION');
  round.submissions[playerId] = colors;
  const events: GameEvent[] = [
    { t: 'partyAnswerSubmitted', playerId, gameId: 'colores' },
  ];

  if (allSubmitted(next, round.submissions)) {
    scoreColors(next);
    next.phase = 'reveal';
    events.push({ t: 'partyRevealed', gameId: 'colores', round: next.round });
    finishScoredRound(next, events);
  }

  return ok({ state: next, events });
}

function scoreColors(state: PartyState): void {
  if (!state.colors) return;
  const correct = colorQuestionById(state.colors.questionId).correctColors;
  for (const player of activePlayers(state)) {
    const answer = state.colors.submissions[player.playerId];
    if (!answer) continue;
    const distances = correct.map((target) => {
      return Math.min(...answer.map((candidate) => colorDistance(candidate, target)));
    });
    const missingOrExtra = Math.abs(answer.length - correct.length);
    const averageDistance =
      distances.reduce((total, distance) => total + distance, 0) / Math.max(1, distances.length) +
      missingOrExtra * 0.18;
    player.score += scoreByColorDistance(averageDistance);
  }
}

function scoreByColorDistance(distance: number): number {
  if (distance <= 0.05) return 4;
  if (distance <= 0.2) return 3;
  if (distance <= 0.38) return 2;
  if (distance <= 0.58) return 1;
  return 0;
}

function applySubmitMajority(
  state: PartyState,
  playerId: PlayerId,
  answer: string,
): PartyActionResult {
  if (state.gameId !== 'mayoria' || !state.majority) return err('INVALID_ACTION');
  const playerResult = requireInputPlayer(state, playerId);
  if (!playerResult.ok) return playerResult;
  const trimmed = answer.trim();
  if (!trimmed || state.majority.submissions[playerId] !== undefined) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  const round = next.majority;
  if (!round) return err('INVALID_ACTION');
  round.submissions[playerId] = trimmed;
  const events: GameEvent[] = [
    { t: 'partyAnswerSubmitted', playerId, gameId: 'mayoria' },
  ];

  if (allSubmitted(next, round.submissions)) {
    scoreMajority(next);
    next.phase = 'reveal';
    events.push({ t: 'partyRevealed', gameId: 'mayoria', round: next.round });
    finishScoredRound(next, events);
  }

  return ok({ state: next, events });
}

function scoreMajority(state: PartyState): void {
  if (!state.majority) return;
  const groups = new Map<string, { display: string; count: number }>();
  for (const answer of Object.values(state.majority.submissions)) {
    const key = normalizeText(answer);
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { display: answer, count: 1 });
  }

  const max = Math.max(...[...groups.values()].map((group) => group.count));
  const winners = [...groups.values()].filter((group) => group.count === max);
  state.majority.majorityAnswers = winners.length === 1 ? [winners[0]?.display ?? ''] : [];

  if (winners.length !== 1) return;
  const winningKey = normalizeText(winners[0]?.display ?? '');
  for (const player of activePlayers(state)) {
    const answer = state.majority.submissions[player.playerId];
    if (answer && normalizeText(answer) === winningKey) player.score += 1;
  }
}

function applySubmitScale(
  state: PartyState,
  playerId: PlayerId,
  value: number,
): PartyActionResult {
  if (state.gameId !== 'escala' || !state.scale) return err('INVALID_ACTION');
  const playerResult = requireInputPlayer(state, playerId);
  if (!playerResult.ok) return playerResult;
  if (playerId === state.scale.cluePlayerId || value < 0 || value > 100) {
    return err('INVALID_ACTION');
  }
  if (state.scale.guesses[playerId] !== undefined) return err('INVALID_ACTION');

  const next = bump(state);
  const round = next.scale;
  if (!round) return err('INVALID_ACTION');
  round.guesses[playerId] = value;
  const events: GameEvent[] = [
    { t: 'partyAnswerSubmitted', playerId, gameId: 'escala' },
  ];

  const estimators = activePlayers(next).filter((player) => player.playerId !== round.cluePlayerId);
  if (estimators.length > 0 && estimators.every((player) => round.guesses[player.playerId] !== undefined)) {
    scoreScale(next);
    next.phase = 'reveal';
    events.push({ t: 'partyRevealed', gameId: 'escala', round: next.round });
    finishScoredRound(next, events);
  }

  return ok({ state: next, events });
}

function scoreScale(state: PartyState): void {
  if (!state.scale) return;
  for (const player of activePlayers(state)) {
    if (player.playerId === state.scale.cluePlayerId) continue;
    const guess = state.scale.guesses[player.playerId];
    if (guess === undefined) continue;
    const distance = Math.abs(guess - state.scale.target);
    player.score += distance <= 10 ? 4 : distance <= 20 ? 3 : distance <= 30 ? 2 : distance <= 40 ? 1 : 0;
  }
}

function finishScoredRound(state: PartyState, events: GameEvent[]): void {
  const target = state.config.gameId === 'orden' ? 0 : state.config.pointsToWin;
  const highestScore = Math.max(...activePlayers(state).map((player) => player.score), 0);
  if (highestScore < target && state.round < partyRounds(state)) return;
  state.status = 'gameEnd';
  state.winnerId = decideWinner(state);
  if (state.winnerId) events.push({ t: 'gameOver', winnerId: state.winnerId });
}

function decideWinner(state: PartyState): PlayerId | null {
  const candidates = activePlayers(state).sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.seat - b.seat;
  });
  return candidates[0]?.playerId ?? null;
}

function partyRounds(state: PartyState): number {
  return state.config.gameId === 'orden' ? Number.MAX_SAFE_INTEGER : state.config.rounds;
}

function applyNextRound(state: PartyState, playerId: PlayerId): PartyActionResult {
  if (state.status !== 'playing' || state.phase !== 'reveal') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');

  const next = bump(state);
  next.phase = 'input';
  next.rematchVotes = [];

  if (next.gameId === 'orden') {
    const current = next.order;
    if (!current) return err('INVALID_ACTION');
    if (player.seat !== 0) return err('NOT_HOST');
    const activeCount = activePlayers(next).length;
    const cardsPerPlayer = current.nextCardsPerPlayer;
    if (current.numberDeck.length < activeCount * cardsPerPlayer) {
      next.status = 'gameEnd';
      next.phase = 'reveal';
      return ok({ state: next, events: [] });
    }
    const dealt = dealOrderRound(next.players, current.numberDeck, cardsPerPlayer);
    next.players = dealt.players;
    next.order = {
      cardsPerPlayer,
      nextCardsPerPlayer: Math.min(cardsPerPlayer + 1, 10),
      highest: 0,
      played: [],
      failure: null,
      numberDeck: dealt.numberDeck,
    };
    next.round += 1;
    return ok({ state: next, events: [{ t: 'dealt', round: next.round }] });
  }

  const nextRoundNumber = next.round + 1;
  next.round = nextRoundNumber;
  if (next.gameId === 'colores') {
    const current = next.colors;
    if (!current) return err('INVALID_ACTION');
    const questionIndex = current.questionIndex + 1;
    next.colors = nextColorsRound(current, questionIndex);
  } else if (next.gameId === 'mayoria') {
    const current = next.majority;
    if (!current) return err('INVALID_ACTION');
    const questionIndex = current.questionIndex + 1;
    next.majority = nextMajorityRound(current, questionIndex);
  } else {
    const current = next.scale;
    if (!current) return err('INVALID_ACTION');
    const questionIndex = current.questionIndex + 1;
    const guide = nextGuide(next, current.cluePlayerId);
    if (!guide) return err('INVALID_ACTION');
    next.scale = nextScaleRound(next, current, questionIndex, guide.playerId);
  }

  return ok({ state: next, events: [{ t: 'dealt', round: next.round }] });
}

function nextQuestionId(order: readonly string[], index: number): string {
  return order[index % order.length] ?? order[0] ?? '';
}

function nextColorsRound(current: ColorsRoundState, questionIndex: number): ColorsRoundState {
  return {
    questionOrder: [...current.questionOrder],
    questionIndex,
    questionId: nextQuestionId(current.questionOrder, questionIndex),
    submissions: {},
  };
}

function nextMajorityRound(current: MajorityRoundState, questionIndex: number): MajorityRoundState {
  return {
    questionOrder: [...current.questionOrder],
    questionIndex,
    questionId: nextQuestionId(current.questionOrder, questionIndex),
    submissions: {},
    majorityAnswers: null,
  };
}

function nextScaleRound(
  state: PartyState,
  current: ScaleRoundState,
  questionIndex: number,
  cluePlayerId: PlayerId,
): ScaleRoundState {
  return {
    questionOrder: [...current.questionOrder],
    questionIndex,
    questionId: nextQuestionId(current.questionOrder, questionIndex),
    cluePlayerId,
    target: randomTarget(state),
    guesses: {},
  };
}

function nextGuide(state: PartyState, currentGuideId: PlayerId): PartyPlayer | undefined {
  const players = activePlayers(state).sort((a, b) => a.seat - b.seat);
  if (players.length === 0) return undefined;
  const currentIndex = players.findIndex((player) => player.playerId === currentGuideId);
  return players[(currentIndex + 1 + players.length) % players.length] ?? players[0];
}

function normalizeText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
