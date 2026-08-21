// Reducer puro de Orden, Colores, Mayoría y Escala.
//
// Todas las decisiones que pueden afectar al resultado pasan por aquí. El
// servidor serializa las llamadas y además exige expectedVersion; por eso una
// segunda jugada simultánea de Orden llega con una versión vieja y no puede
// convertirse en otra primera carta válida.

import {
  COLOR_ANSWER_SECONDS,
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
import { COLOR_NAMES, colorQuestionById } from './content.ts';
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

function cloneRecord<T>(
  record: Record<PlayerId, T>,
  cloneValue: (value: T) => T,
): Record<PlayerId, T> {
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
          scoreDeltas: state.colors.scoreDeltas ? { ...state.colors.scoreDeltas } : null,
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
          groups: state.majority.groups
            ? state.majority.groups.map((group) => ({
                answer: group.answer,
                playerIds: [...group.playerIds],
              }))
            : null,
          scoreDeltas: state.majority.scoreDeltas ? { ...state.majority.scoreDeltas } : null,
        }
      : null,
    scale: state.scale
      ? {
          ...state.scale,
          questionOrder: [...state.scale.questionOrder],
          clueSequence: [...state.scale.clueSequence],
          guesses: { ...state.scale.guesses },
          scoreDeltas: state.scale.scoreDeltas ? { ...state.scale.scoreDeltas } : null,
          groupScores: { ...state.scale.groupScores },
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
      groupIndex: player.groupIndex ?? null,
      hand: [],
    }));
}

function scaleClueSequence(state: PartyState): PlayerId[] {
  const players = activePlayers(state).sort((a, b) => a.seat - b.seat);
  if (state.config.gameId !== 'escala' || state.config.groupMode === 'individual') {
    return players.map((player) => player.playerId);
  }

  const groups = new Map<number, PartyPlayer[]>();
  for (const player of players) {
    if (player.groupIndex === null) continue;
    const group = groups.get(player.groupIndex) ?? [];
    group.push(player);
    groups.set(player.groupIndex, group);
  }

  const sequence: PlayerId[] = [];
  const maxGroupSize = Math.max(...[...groups.values()].map((group) => group.length), 0);
  for (let memberIndex = 0; memberIndex < maxGroupSize; memberIndex += 1) {
    for (let groupIndex = 0; groupIndex < state.config.groupCount; groupIndex += 1) {
      const group = groups.get(groupIndex);
      if (!group || group.length === 0) continue;
      // Si los grupos no tienen el mismo tamaño, el grupo pequeño repite su
      // rotación cuando el grande aún tiene personas pendientes. Así la misma
      // escala pasa por todos los grupos el mismo número de veces.
      const player = group[memberIndex % group.length];
      if (player) sequence.push(player.playerId);
    }
  }
  return sequence.length > 0 ? sequence : players.map((player) => player.playerId);
}

function initialScaleGroupScores(state: PartyState): Record<string, number> {
  if (state.config.gameId !== 'escala' || state.config.groupMode === 'individual') return {};
  return Object.fromEntries(
    Array.from({ length: state.config.groupCount }, (_, index) => [String(index), 0]),
  );
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
    pinkCowPlayerId: null,
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

  const colorTopic = config.gameId === 'colores' ? config.topic : 'todo';
  const questionOrder = shuffled(state, questionIdsFor(gameId, colorTopic));
  const questionId = questionOrder[0] ?? '';

  if (gameId === 'colores') {
    state.colors = {
      questionOrder,
      questionIndex: 0,
      questionId,
      submissions: {},
      deadlineAt: null,
      rollover: 0,
      scoreDeltas: null,
    };
  } else if (gameId === 'mayoria') {
    state.majority = {
      questionOrder,
      questionIndex: 0,
      questionId,
      submissions: {},
      majorityAnswers: null,
      groups: null,
      scoreDeltas: null,
    };
  } else {
    const firstPlayer = activePlayers(state)[0];
    if (!firstPlayer) throw new Error('Escala necesita al menos un jugador');
    const clueSequence = scaleClueSequence(state);
    const cluePlayerId = clueSequence[0] ?? firstPlayer.playerId;
    const cluePlayer = findPlayer(state, cluePlayerId) ?? firstPlayer;
    state.scale = {
      questionOrder,
      questionIndex: 0,
      questionId,
      cluePlayerId,
      clueGroupIndex: cluePlayer.groupIndex,
      clueSequence,
      clueSequenceIndex: 0,
      scaleSet: 1,
      target: randomTarget(state),
      clueText: null,
      deadlineAt: null,
      guesses: {},
      scoreDeltas: null,
      groupScores: initialScaleGroupScores(state),
      winnerGroupIndex: null,
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
  switch (action.type) {
    case 'playNumber':
      return applyPlayNumber(state, playerId, action.value);
    case 'setOrderCards':
      return applySetOrderCards(state, playerId, action.count);
    case 'endOrder':
      return applyEndOrder(state, playerId);
    case 'submitColors':
      return applySubmitColors(state, playerId, action.colors, now);
    case 'finishColors':
      return applyFinishColors(state, now);
    case 'submitMajority':
      return applySubmitMajority(state, playerId, action.answer);
    case 'resolveMajority':
      return applyResolveMajority(state, playerId, action.groups);
    case 'submitScaleClue':
      return applySubmitScaleClue(state, playerId, action.clue, now);
    case 'submitScale':
      return applySubmitScale(state, playerId, action.value, now);
    case 'finishScale':
      return applyFinishScale(state, now);
    case 'nextRound':
      return applyNextRound(state, playerId);
    default:
      return err('INVALID_ACTION');
  }
}

function requireInputPlayer(state: PartyState, playerId: PlayerId): Result<PartyPlayer> {
  if (state.status !== 'playing' || state.phase !== 'input') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  return ok(player);
}

function allSubmitted(state: PartyState, submissions: Record<PlayerId, unknown>): boolean {
  const players = activePlayers(state);
  return (
    players.length > 0 && players.every((player) => submissions[player.playerId] !== undefined)
  );
}

function applyPlayNumber(state: PartyState, playerId: PlayerId, value: number): PartyActionResult {
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
  now: number,
): PartyActionResult {
  if (state.gameId !== 'colores' || !state.colors) return err('INVALID_ACTION');
  const playerResult = requireInputPlayer(state, playerId);
  if (!playerResult.ok) return playerResult;
  if (state.colors.deadlineAt !== null && now >= state.colors.deadlineAt) {
    return err('INVALID_ACTION');
  }
  const colors = canonicalColors(values);
  const question = colorQuestionById(state.colors.questionId);
  if (!colors || colors.length !== question.correctColors.length) {
    return err('INVALID_ACTION');
  }
  if (state.colors.submissions[playerId] !== undefined) return err('INVALID_ACTION');

  const next = bump(state);
  const round = next.colors;
  if (!round) return err('INVALID_ACTION');
  round.submissions[playerId] = colors;
  round.deadlineAt ??= now + COLOR_ANSWER_SECONDS * 1000;
  const events: GameEvent[] = [{ t: 'partyAnswerSubmitted', playerId, gameId: 'colores' }];

  if (allSubmitted(next, round.submissions)) {
    revealColorsRound(next, events);
  }

  return ok({ state: next, events });
}

function applyFinishColors(state: PartyState, now: number): PartyActionResult {
  if (
    state.gameId !== 'colores' ||
    state.status !== 'playing' ||
    state.phase !== 'input' ||
    !state.colors ||
    state.colors.deadlineAt === null ||
    now < state.colors.deadlineAt
  ) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  const events: GameEvent[] = [];
  revealColorsRound(next, events);
  return ok({ state: next, events });
}

function revealColorsRound(state: PartyState, events: GameEvent[]): void {
  const round = state.colors;
  if (!round) return;
  const correctColors = colorQuestionById(round.questionId).correctColors;
  const players = activePlayers(state);
  const correctIds = new Set(
    players
      .filter((player) => isExactColorAnswer(round.submissions[player.playerId], correctColors))
      .map((player) => player.playerId),
  );
  const scoreDeltas = Object.fromEntries(players.map((player) => [player.playerId, 0])) as Record<
    PlayerId,
    number
  >;

  if (correctIds.size === players.length && players.length > 0) {
    round.rollover += 1;
  } else if (correctIds.size > 0) {
    const points = players.length - correctIds.size + round.rollover;
    for (const player of players) {
      if (!correctIds.has(player.playerId)) continue;
      player.score += points;
      scoreDeltas[player.playerId] = points;
    }
    round.rollover = 0;
  } else {
    round.rollover = 0;
  }

  round.deadlineAt = null;
  round.scoreDeltas = scoreDeltas;
  state.phase = 'reveal';
  events.push({ t: 'partyRevealed', gameId: 'colores', round: state.round });
  finishScoredRound(state, events);
}

function isExactColorAnswer(
  answer: readonly string[] | undefined,
  correctColors: readonly string[],
): boolean {
  return (
    answer !== undefined &&
    answer.length === correctColors.length &&
    correctColors.every((color) => answer.includes(color))
  );
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
  const events: GameEvent[] = [{ t: 'partyAnswerSubmitted', playerId, gameId: 'mayoria' }];

  if (allSubmitted(next, round.submissions)) {
    next.phase = 'reveal';
    events.push({ t: 'partyRevealed', gameId: 'mayoria', round: next.round });
  }

  return ok({ state: next, events });
}

function applyResolveMajority(
  state: PartyState,
  playerId: PlayerId,
  groups: readonly (readonly string[])[],
): PartyActionResult {
  if (state.gameId !== 'mayoria' || !state.majority) return err('INVALID_ACTION');
  if (state.status !== 'playing' || state.phase !== 'reveal') return err('INVALID_ACTION');

  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (player.seat !== 0) return err('NOT_HOST');
  if (state.majority.groups !== null) return err('INVALID_ACTION');

  const active = activePlayers(state);
  const activeIds = new Set(active.map((candidate) => candidate.playerId));
  const seen = new Set<PlayerId>();
  const resolvedGroups: MajorityRoundState['groups'] = [];

  for (const groupPlayerIds of groups) {
    if (groupPlayerIds.length === 0) return err('INVALID_ACTION');
    const groupIds: PlayerId[] = [];
    for (const candidateId of groupPlayerIds) {
      const id = candidateId as PlayerId;
      if (!activeIds.has(id) || seen.has(id) || state.majority.submissions[id] === undefined) {
        return err('INVALID_ACTION');
      }
      seen.add(id);
      groupIds.push(id);
    }
    const firstId = groupIds[0];
    if (!firstId) return err('INVALID_ACTION');
    const firstAnswer = state.majority.submissions[firstId];
    if (firstAnswer === undefined) return err('INVALID_ACTION');
    resolvedGroups.push({
      answer: firstAnswer,
      playerIds: groupIds,
    });
  }

  if (seen.size !== activeIds.size) return err('INVALID_ACTION');

  const next = bump(state);
  const round = next.majority;
  if (!round) return err('INVALID_ACTION');
  round.groups = resolvedGroups;
  scoreMajority(next);
  const events: GameEvent[] = [];
  finishScoredRound(next, events);
  return ok({ state: next, events });
}

function scoreMajority(state: PartyState): void {
  if (!state.majority) return;
  const groups = state.majority.groups;
  if (!groups?.length) return;

  const scoreDeltas = Object.fromEntries(
    activePlayers(state).map((player) => [player.playerId, 0]),
  ) as Record<PlayerId, number>;
  const max = Math.max(...groups.map((group) => group.playerIds.length));
  const winners = groups.filter((group) => group.playerIds.length === max);
  state.majority.majorityAnswers = winners.length === 1 ? [winners[0]?.answer ?? ''] : [];

  if (winners.length === 1) {
    for (const playerId of winners[0]?.playerIds ?? []) {
      const player = state.players.find((candidate) => candidate.playerId === playerId);
      if (!player) continue;
      player.score += 1;
      scoreDeltas[playerId] = 1;
    }

    const uniqueGroups = groups.filter((group) => group.playerIds.length === 1);
    if (uniqueGroups.length === 1) {
      state.pinkCowPlayerId = uniqueGroups[0]?.playerIds[0] ?? state.pinkCowPlayerId;
    }
  }

  state.majority.scoreDeltas = scoreDeltas;
}

function applySubmitScaleClue(
  state: PartyState,
  playerId: PlayerId,
  clue: string,
  now: number,
): PartyActionResult {
  if (state.gameId !== 'escala' || !state.scale || !clue.trim()) return err('INVALID_ACTION');
  const playerResult = requireInputPlayer(state, playerId);
  if (!playerResult.ok) return playerResult;
  if (playerId !== state.scale.cluePlayerId || state.scale.clueText !== null) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  const round = next.scale;
  if (!round || next.config.gameId !== 'escala') return err('INVALID_ACTION');
  round.clueText = clue.trim();
  round.deadlineAt = now + next.config.answerTimeSeconds * 1000;
  const events: GameEvent[] = [{ t: 'partyAnswerSubmitted', playerId, gameId: 'escala' }];

  if (scaleGuessers(next).length === 0) {
    resolveScaleRound(next, events);
  }
  return ok({ state: next, events });
}

function isScaleGuesser(state: PartyState, playerId: PlayerId): boolean {
  if (state.gameId !== 'escala' || !state.scale || playerId === state.scale.cluePlayerId) {
    return false;
  }
  const player = findPlayer(state, playerId);
  if (!player || player.left) return false;
  if (state.config.gameId !== 'escala' || state.config.groupMode === 'individual') return true;
  return player.groupIndex !== state.scale.clueGroupIndex;
}

function scaleGuessers(state: PartyState): PartyPlayer[] {
  return activePlayers(state).filter((player) => isScaleGuesser(state, player.playerId));
}

function applySubmitScale(
  state: PartyState,
  playerId: PlayerId,
  value: number,
  now: number,
): PartyActionResult {
  if (state.gameId !== 'escala' || !state.scale) return err('INVALID_ACTION');
  const playerResult = requireInputPlayer(state, playerId);
  if (!playerResult.ok) return playerResult;
  if (
    state.scale.clueText === null ||
    !isScaleGuesser(state, playerId) ||
    (state.scale.deadlineAt !== null && now >= state.scale.deadlineAt) ||
    value < 0 ||
    value > 100
  ) {
    return err('INVALID_ACTION');
  }
  if (state.scale.guesses[playerId] !== undefined) return err('INVALID_ACTION');

  const next = bump(state);
  const round = next.scale;
  if (!round) return err('INVALID_ACTION');
  round.guesses[playerId] = value;
  const events: GameEvent[] = [{ t: 'partyAnswerSubmitted', playerId, gameId: 'escala' }];

  if (
    scaleGuessers(next).length > 0 &&
    scaleGuessers(next).every((player) => round.guesses[player.playerId] !== undefined)
  ) {
    resolveScaleRound(next, events);
  }

  return ok({ state: next, events });
}

function applyFinishScale(state: PartyState, now: number): PartyActionResult {
  if (
    state.gameId !== 'escala' ||
    state.status !== 'playing' ||
    state.phase !== 'input' ||
    !state.scale ||
    state.scale.clueText === null ||
    state.scale.deadlineAt === null ||
    now < state.scale.deadlineAt
  ) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  const events: GameEvent[] = [];
  resolveScaleRound(next, events);
  return ok({ state: next, events });
}

function scalePoints(distance: number): number {
  return distance <= 10 ? 4 : distance <= 20 ? 3 : distance <= 30 ? 2 : distance <= 40 ? 1 : 0;
}

function resolveScaleRound(state: PartyState, events: GameEvent[]): void {
  if (!state.scale || state.phase !== 'input') return;
  scoreScale(state);
  state.scale.deadlineAt = null;
  state.phase = 'reveal';
  events.push({ t: 'partyRevealed', gameId: 'escala', round: state.round });
  if (scaleSetComplete(state)) finishScaleSet(state, events);
}

function scoreScale(state: PartyState): void {
  if (!state.scale) return;
  const scoreDeltas: Record<PlayerId, number> = {};
  for (const player of activePlayers(state)) {
    if (!isScaleGuesser(state, player.playerId)) continue;
    const guess = state.scale.guesses[player.playerId];
    const points = guess === undefined ? 0 : scalePoints(Math.abs(guess - state.scale.target));
    player.score += points;
    scoreDeltas[player.playerId] = points;
    if (player.groupIndex !== null) {
      const key = String(player.groupIndex);
      state.scale.groupScores[key] = (state.scale.groupScores[key] ?? 0) + points;
    }
  }
  state.scale.scoreDeltas = scoreDeltas;
}

function scaleSetComplete(state: PartyState): boolean {
  if (!state.scale || state.config.gameId !== 'escala') return true;
  return (
    state.config.groupMode === 'individual' ||
    state.scale.clueSequenceIndex >= state.scale.clueSequence.length - 1
  );
}

function finishScaleSet(state: PartyState, events: GameEvent[]): void {
  if (!state.scale || state.config.gameId !== 'escala') return;
  const target = state.config.pointsToWin;

  if (state.config.groupMode === 'groups') {
    const scores = Array.from({ length: state.config.groupCount }, (_, index) => ({
      index,
      score: state.scale?.groupScores[String(index)] ?? 0,
    }));
    const highestScore = Math.max(...scores.map((group) => group.score), 0);
    const winner = scores.find((group) => group.score === highestScore);
    if (highestScore < target && state.scale.scaleSet < state.config.rounds) return;
    state.status = 'gameEnd';
    state.winnerId =
      activePlayers(state).find((player) => player.groupIndex === winner?.index)?.playerId ?? null;
    state.scale.winnerGroupIndex = winner?.index ?? null;
    if (state.winnerId) events.push({ t: 'gameOver', winnerId: state.winnerId });
    return;
  }

  const highestScore = Math.max(...activePlayers(state).map((player) => player.score), 0);
  if (highestScore < target && state.scale.scaleSet < state.config.rounds) return;
  state.status = 'gameEnd';
  state.winnerId = decideWinner(state);
  if (state.winnerId) events.push({ t: 'gameOver', winnerId: state.winnerId });
}

function finishScoredRound(state: PartyState, events: GameEvent[]): void {
  const target = state.config.gameId === 'orden' ? 0 : state.config.pointsToWin;
  if (state.config.gameId === 'mayoria') {
    const eligible = activePlayers(state).filter(
      (player) => player.playerId !== state.pinkCowPlayerId,
    );
    const highestEligibleScore = Math.max(...eligible.map((player) => player.score), 0);
    const leaders = eligible.filter((player) => player.score === highestEligibleScore);
    if (highestEligibleScore < target || leaders.length !== 1) return;
    state.status = 'gameEnd';
    state.winnerId = leaders[0]?.playerId ?? null;
    if (state.winnerId) events.push({ t: 'gameOver', winnerId: state.winnerId });
    return;
  }

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
  return state.config.gameId === 'orden' || state.config.gameId === 'mayoria'
    ? Number.MAX_SAFE_INTEGER
    : state.config.rounds;
}

function applyNextRound(state: PartyState, playerId: PlayerId): PartyActionResult {
  if (state.status !== 'playing' || state.phase !== 'reveal') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.gameId === 'mayoria') {
    if (player.seat !== 0) return err('NOT_HOST');
    if (!state.majority || state.majority.groups === null) return err('INVALID_ACTION');
  }

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
    if (
      next.config.gameId === 'escala' &&
      next.config.groupMode === 'groups' &&
      current.clueSequenceIndex < current.clueSequence.length - 1
    ) {
      next.scale = nextScaleTurn(next, current, current.clueSequenceIndex + 1);
    } else {
      const questionIndex = current.questionIndex + 1;
      const guide = nextGuide(next, current.cluePlayerId);
      if (!guide) return err('INVALID_ACTION');
      next.scale = nextScaleRound(next, current, questionIndex, guide.playerId);
    }
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
    deadlineAt: null,
    rollover: current.rollover,
    scoreDeltas: null,
  };
}

function nextMajorityRound(current: MajorityRoundState, questionIndex: number): MajorityRoundState {
  return {
    questionOrder: [...current.questionOrder],
    questionIndex,
    questionId: nextQuestionId(current.questionOrder, questionIndex),
    submissions: {},
    majorityAnswers: null,
    groups: null,
    scoreDeltas: null,
  };
}

function nextScaleRound(
  state: PartyState,
  current: ScaleRoundState,
  questionIndex: number,
  cluePlayerId: PlayerId,
): ScaleRoundState {
  const clueSequence = scaleClueSequence(state);
  const actualCluePlayerId =
    state.config.gameId === 'escala' && state.config.groupMode === 'groups'
      ? (clueSequence[0] ?? cluePlayerId)
      : cluePlayerId;
  const clue = state.players.find((player) => player.playerId === actualCluePlayerId);
  return {
    questionOrder: [...current.questionOrder],
    questionIndex,
    questionId: nextQuestionId(current.questionOrder, questionIndex),
    cluePlayerId: actualCluePlayerId,
    clueGroupIndex: clue?.groupIndex ?? null,
    clueSequence,
    clueSequenceIndex: 0,
    scaleSet: current.scaleSet + 1,
    target: randomTarget(state),
    clueText: null,
    deadlineAt: null,
    guesses: {},
    scoreDeltas: null,
    groupScores: { ...current.groupScores },
    winnerGroupIndex: null,
  };
}

function nextScaleTurn(
  state: PartyState,
  current: ScaleRoundState,
  clueSequenceIndex: number,
): ScaleRoundState {
  const cluePlayerId = current.clueSequence[clueSequenceIndex];
  const clue = state.players.find((player) => player.playerId === cluePlayerId);
  return {
    ...current,
    cluePlayerId: cluePlayerId ?? current.cluePlayerId,
    clueGroupIndex: clue?.groupIndex ?? null,
    clueSequenceIndex,
    clueText: null,
    deadlineAt: null,
    guesses: {},
    scoreDeltas: null,
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
