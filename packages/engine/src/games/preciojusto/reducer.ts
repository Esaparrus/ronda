import type { CreateInitialStateInput } from '../../core/types.ts';
import { shuffle } from '../../core/rng.ts';
import type { GameAction, GameEvent, PlayerId, Result } from '@ronda/protocol';
import { err, ok } from '@ronda/protocol';
import { PRICE_QUESTIONS, priceQuestionById, priceQuestionIdsFor, type PriceQuestion } from './content.ts';
import {
  activePlayers,
  findPlayer,
  precioJustoConfigForGame,
  type PrecioJustoGuessResult,
  type PrecioJustoPlayer,
  type PrecioJustoRoundState,
  type PrecioJustoState,
} from './state.ts';

export type PrecioJustoActionResult = Result<{
  state: PrecioJustoState;
  events: GameEvent[];
}>;

type PrecioJustoInitialStateInput = CreateInitialStateInput & {
  /** Inyectado por el servidor; nunca lo consulta el motor por su cuenta. */
  precioJustoQuestions?: readonly PriceQuestion[];
};

export function createInitialState(
  input: PrecioJustoInitialStateInput & {
    roomCode?: string;
    players: (CreateInitialStateInput['players'][number] & { isBot?: boolean })[];
  },
): PrecioJustoState {
  const config = precioJustoConfigForGame(input.config);
  const suppliedQuestions = input.precioJustoQuestions;
  const questions = (suppliedQuestions?.length ? suppliedQuestions : PRICE_QUESTIONS).map((question) => ({
    ...question,
  }));
  const state: PrecioJustoState = {
    version: 0,
    status: 'playing',
    phase: 'input',
    config,
    gameId: 'preciojusto',
    roomCode: input.roomCode ?? '',
    rng: { seed: input.seed, calls: 0 },
    round: 1,
    turnSeat: null,
    players: initialPlayers(input.players),
    questions,
    price: {
      questionOrder: [],
      questionIndex: 0,
      questionId: '',
      submissions: {},
      deadlineAt: null,
      scoreDeltas: null,
      results: null,
    },
    winnerId: null,
    rematchVotes: [],
  };

  const availableIds = priceQuestionIdsFor(config.category, questions);
  const questionOrder = shuffled(
    state,
    availableIds.length > 0 ? availableIds : priceQuestionIdsFor('todo', questions),
  );
  state.price.questionOrder = questionOrder;
  state.price.questionId = questionOrder[0] ?? '';
  return state;
}

export function applyAction(
  state: PrecioJustoState,
  playerId: PlayerId,
  action: GameAction,
  now: number,
): PrecioJustoActionResult {
  switch (action.type) {
    case 'submitPrice':
      return submitPrice(state, playerId, action.priceCents);
    case 'finishPrice':
      return finishPrice(state, playerId, now);
    case 'nextRound':
      return nextRound(state, playerId);
    case 'showPriceResults':
      return showPriceResults(state, playerId);
    default:
      return err('INVALID_ACTION');
  }
}

function submitPrice(
  state: PrecioJustoState,
  playerId: PlayerId,
  priceCents: number,
): PrecioJustoActionResult {
  if (state.status !== 'playing' || state.phase !== 'input') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (!Number.isInteger(priceCents) || priceCents < 1 || priceCents > 100_000_000) {
    return err('INVALID_ACTION');
  }
  if (state.price.submissions[playerId] !== undefined) return err('INVALID_ACTION');

  const next = bump(state);
  next.price.submissions[playerId] = priceCents;
  const events: GameEvent[] = [{ t: 'priceAnswerSubmitted', playerId }];
  if (allActivePlayersSubmitted(next)) reveal(next, events);
  return ok({ state: next, events });
}

function finishPrice(
  state: PrecioJustoState,
  playerId: PlayerId,
  now: number,
): PrecioJustoActionResult {
  if (state.status !== 'playing' || state.phase !== 'input') return err('INVALID_ACTION');
  if (!isHost(state, playerId)) return err('NOT_HOST');
  const deadline = state.price.deadlineAt;
  // Sin límite de tiempo, el anfitrión puede cerrar manualmente la ronda. Con
  // temporizador, solo el reloj del servidor puede ejecutar esta acción.
  if (deadline === null && state.config.answerTimeSeconds > 0) return err('INVALID_ACTION');
  if (deadline !== null && now < deadline) return err('INVALID_ACTION');

  const next = bump(state);
  const events: GameEvent[] = [];
  reveal(next, events);
  return ok({ state: next, events });
}

function nextRound(state: PrecioJustoState, playerId: PlayerId): PrecioJustoActionResult {
  if (state.status !== 'playing' || state.phase !== 'reveal') return err('INVALID_ACTION');
  if (!isHost(state, playerId)) return err('NOT_HOST');
  if (state.round >= state.config.rounds) return err('INVALID_ACTION');

  const next = bump(state);
  const nextIndex = (state.price.questionIndex + 1) % state.price.questionOrder.length;
  next.round += 1;
  next.phase = 'input';
  next.price = {
    questionOrder: [...state.price.questionOrder],
    questionIndex: nextIndex,
    questionId: state.price.questionOrder[nextIndex] ?? state.price.questionId,
    submissions: {},
    deadlineAt: null,
    scoreDeltas: null,
    results: null,
  };
  next.rematchVotes = [];
  return ok({ state: next, events: [{ t: 'dealt', round: next.round }] });
}

function showPriceResults(state: PrecioJustoState, playerId: PlayerId): PrecioJustoActionResult {
  if (state.status !== 'playing' || state.phase !== 'reveal') return err('INVALID_ACTION');
  if (!isHost(state, playerId)) return err('NOT_HOST');
  if (state.round < state.config.rounds) return err('INVALID_ACTION');

  const next = bump(state);
  next.status = 'gameEnd';
  next.winnerId = decideWinner(next);
  const events: GameEvent[] = [];
  if (next.winnerId) events.push({ t: 'gameOver', winnerId: next.winnerId });
  return ok({ state: next, events });
}

function reveal(state: PrecioJustoState, events: GameEvent[]): void {
  const question = priceQuestionById(state.price.questionId, state.questions);
  const results: Record<PlayerId, PrecioJustoGuessResult> = {};
  const scoreDeltas: Record<PlayerId, number> = {};

  for (const player of state.players) {
    const guess = state.price.submissions[player.playerId];
    if (guess === undefined || player.left) {
      results[player.playerId] = {
        priceCents: guess ?? null,
        differenceCents: guess === undefined ? null : Math.abs(guess - question.referencePriceCents),
        relativeErrorPercent:
          guess === undefined
            ? null
            : relativeErrorPercentForPrice(guess, question.referencePriceCents),
        points: 0,
      };
      scoreDeltas[player.playerId] = 0;
      continue;
    }

    const differenceCents = Math.abs(guess - question.referencePriceCents);
    const exactRelativeErrorPercent = exactRelativeErrorPercentForPrice(
      guess,
      question.referencePriceCents,
    );
    const relativeErrorPercent = Number(exactRelativeErrorPercent.toFixed(1));
    const points = pricePointsForRelativeError(exactRelativeErrorPercent);
    results[player.playerId] = {
      priceCents: guess,
      differenceCents,
      relativeErrorPercent,
      points,
    };
    scoreDeltas[player.playerId] = points;
  }

  for (const player of state.players) {
    const delta = scoreDeltas[player.playerId] ?? 0;
    if (!player.left) player.score += delta;
  }

  state.phase = 'reveal';
  state.price.deadlineAt = null;
  state.price.scoreDeltas = scoreDeltas;
  state.price.results = results;
  events.push({ t: 'priceRevealed', round: state.round });
}

function allActivePlayersSubmitted(state: PrecioJustoState): boolean {
  const players = activePlayers(state);
  return players.length > 0 && players.every((player) => state.price.submissions[player.playerId] !== undefined);
}

function initialPlayers(
  players: (CreateInitialStateInput['players'][number] & { isBot?: boolean })[],
): PrecioJustoPlayer[] {
  return [...players]
    .sort((left, right) => left.seat - right.seat)
    .map((player) => ({
      playerId: player.playerId,
      nick: player.nick,
      seat: player.seat,
      isBot: player.isBot ?? false,
      score: 0,
      left: false,
      hand: [],
    }));
}

function shuffled(state: PrecioJustoState, ids: readonly string[]): string[] {
  const result = shuffle(ids, state.rng.seed, state.rng.calls);
  state.rng.calls = result.calls;
  return result.items;
}

function decideWinner(state: PrecioJustoState): PlayerId | null {
  return (
    [...activePlayers(state)].sort((left, right) => right.score - left.score || left.seat - right.seat)[0]
      ?.playerId ?? null
  );
}

function isHost(state: PrecioJustoState, playerId: PlayerId): boolean {
  const player = findPlayer(state, playerId);
  const host = activePlayers(state).sort((left, right) => left.seat - right.seat)[0];
  return player !== undefined && !player.left && host?.playerId === playerId;
}

function bump(state: PrecioJustoState): PrecioJustoState {
  return {
    ...state,
    version: state.version + 1,
    rng: { ...state.rng },
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    questions: state.questions.map((question) => ({ ...question })),
    price: cloneRound(state.price),
    rematchVotes: [...state.rematchVotes],
  };
}

function cloneRound(round: PrecioJustoRoundState): PrecioJustoRoundState {
  return {
    ...round,
    questionOrder: [...round.questionOrder],
    submissions: { ...round.submissions },
    scoreDeltas: round.scoreDeltas ? { ...round.scoreDeltas } : null,
    results: round.results
      ? Object.fromEntries(Object.entries(round.results).map(([id, result]) => [id, { ...result }]))
      : null,
  };
}

export function relativeErrorPercentForPrice(priceCents: number, referencePriceCents: number): number {
  return Number(exactRelativeErrorPercentForPrice(priceCents, referencePriceCents).toFixed(1));
}

function exactRelativeErrorPercentForPrice(priceCents: number, referencePriceCents: number): number {
  if (referencePriceCents <= 0) return 100;
  return (Math.abs(priceCents - referencePriceCents) * 100) / referencePriceCents;
}

/**
 * Curva inicial del roadmap. Entre 35 % y 50 % se interpola linealmente para
 * evitar un salto artificial; en los seis puntos de corte el resultado es el
 * de la tabla editorial.
 */
export function pricePointsForRelativeError(relativeErrorPercent: number): number {
  if (relativeErrorPercent <= 0) return 100;
  if (relativeErrorPercent <= 5) return 90;
  if (relativeErrorPercent <= 10) return 80;
  if (relativeErrorPercent <= 20) return 60;
  if (relativeErrorPercent <= 35) return 30;
  if (relativeErrorPercent >= 50) return 0;
  return Math.round(((50 - relativeErrorPercent) / 15) * 30);
}
