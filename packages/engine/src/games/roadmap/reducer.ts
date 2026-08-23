import type { GameAction, GameEvent, PlayerId, Result } from '@ronda/protocol';
import { BANDERAS_PRESSURE_SECONDS, err, ok } from '@ronda/protocol';
import { shuffle } from '../../core/rng.ts';
import type { CreateInitialStateInput } from '../../core/types.ts';
import {
  CIFRAS_QUESTIONS,
  cifrasQuestionById,
  cifrasQuestionIdsFor,
  FLAG_QUESTIONS,
  flagQuestionById,
  flagQuestionIdsFor,
  SENTENCE_QUESTIONS,
  sentenceQuestionById,
  sentenceQuestionIdsFor,
  WHO_QUESTIONS,
  whoQuestionIdsFor,
  type CifrasQuestion,
  type FlagQuestion,
} from './content.ts';
import {
  activePlayers,
  findPlayer,
  type BanderasState,
  type CifrasState,
  type CompletaLaFraseState,
  type QuienLoHariaState,
  type RoadmapPlayer,
  type RoadmapState,
} from './state.ts';

export type RoadmapActionResult = Result<{ state: RoadmapState; events: GameEvent[] }>;

type RoadmapInitialInput = CreateInitialStateInput & {
  roomCode?: string;
  players: (CreateInitialStateInput['players'][number] & { isBot?: boolean })[];
};

function initialPlayers(input: RoadmapInitialInput): RoadmapPlayer[] {
  return [...input.players]
    .sort((left, right) => left.seat - right.seat)
    .map((player) => ({
      playerId: player.playerId,
      nick: player.nick,
      seat: player.seat,
      hand: [],
      score: 0,
      left: false,
      isBot: player.isBot ?? false,
    }));
}

function shuffled<T>(
  seed: string,
  calls: number,
  values: readonly T[],
): { items: T[]; calls: number } {
  return shuffle(values, seed, calls);
}

function roadmapBase(
  input: RoadmapInitialInput,
): Pick<
  RoadmapState,
  | 'version'
  | 'status'
  | 'phase'
  | 'roomCode'
  | 'rng'
  | 'round'
  | 'turnSeat'
  | 'winnerId'
  | 'rematchVotes'
  | 'players'
> {
  return {
    version: 0,
    status: 'playing',
    phase: 'input',
    roomCode: input.roomCode ?? '',
    rng: { seed: input.seed, calls: 0 },
    round: 1,
    turnSeat: null,
    winnerId: null,
    rematchVotes: [],
    players: initialPlayers(input),
  };
}

export function createBanderasState(input: RoadmapInitialInput): BanderasState {
  if (input.config.gameId !== 'banderas') throw new Error('Configuración inválida para Banderas');
  const config = { ...input.config, difficulty: 'dificil' as const };
  const ids = flagQuestionIdsFor(config.region, config.difficulty);
  const order = shuffled(input.seed, 0, ids);
  return {
    ...roadmapBase(input),
    gameId: 'banderas',
    config,
    questions: FLAG_QUESTIONS.map((question) => ({
      ...question,
      options: question.options.map((option) => ({ ...option })) as FlagQuestion['options'],
    })),
    flags: {
      questionOrder: order.items,
      questionIndex: 0,
      questionId: order.items[0] ?? '',
      submissions: {},
      deadlineAt: null,
      scoreDeltas: null,
    },
    rng: { seed: input.seed, calls: order.calls },
  };
}

export function createCifrasState(input: RoadmapInitialInput): CifrasState {
  if (input.config.gameId !== 'cifras') throw new Error('Configuración inválida para Cifras');
  const ids = cifrasQuestionIdsFor(input.config.category, input.config.mode);
  const order = shuffled(input.seed, 0, ids);
  return {
    ...roadmapBase(input),
    gameId: 'cifras',
    config: input.config,
    questions: CIFRAS_QUESTIONS.map((question) => ({
      ...question,
      ...(question.kind === 'order' ? { items: question.items.map((item) => ({ ...item })) } : {}),
    })) as CifrasQuestion[],
    cifras: {
      questionOrder: order.items,
      questionIndex: 0,
      questionId: order.items[0] ?? '',
      submissions: {},
      orderSubmissions: {},
      deadlineAt: null,
      scoreDeltas: null,
      estimateResults: null,
      orderResults: null,
    },
    rng: { seed: input.seed, calls: order.calls },
  };
}

export function createQuienLoHariaState(input: RoadmapInitialInput): QuienLoHariaState {
  if (input.config.gameId !== 'quienloharia')
    throw new Error('Configuración inválida para Quién lo haría');
  const ids = whoQuestionIdsFor(input.config.pack);
  const order = shuffled(input.seed, 0, ids);
  return {
    ...roadmapBase(input),
    gameId: 'quienloharia',
    config: input.config,
    questions: WHO_QUESTIONS.map((question) => ({ ...question })),
    who: {
      questionOrder: order.items,
      questionIndex: 0,
      questionId: order.items[0] ?? '',
      submissions: {},
      deadlineAt: null,
      scoreDeltas: null,
      voteCounts: null,
    },
    history: [],
    rng: { seed: input.seed, calls: order.calls },
  };
}

export function createCompletaLaFraseState(input: RoadmapInitialInput): CompletaLaFraseState {
  if (input.config.gameId !== 'completalafrase')
    throw new Error('Configuración inválida para Completa la frase');
  const ids = sentenceQuestionIdsFor(input.config.pack);
  const order = shuffled(input.seed, 0, ids);
  return {
    ...roadmapBase(input),
    gameId: 'completalafrase',
    config: input.config,
    questions: SENTENCE_QUESTIONS.map((question) => ({
      ...question,
      acceptedAnswers: [...question.acceptedAnswers],
    })),
    sentence: {
      questionOrder: order.items,
      questionIndex: 0,
      questionId: order.items[0] ?? '',
      submissions: {},
      hintUsed: {},
      deadlineAt: null,
      scoreDeltas: null,
      results: null,
    },
    rng: { seed: input.seed, calls: order.calls },
  };
}

export function applyAction(
  state: RoadmapState,
  playerId: PlayerId,
  action: GameAction,
  now: number,
): RoadmapActionResult {
  switch (state.gameId) {
    case 'banderas':
      return applyFlagsAction(state, playerId, action, now);
    case 'cifras':
      return applyCifrasAction(state, playerId, action, now);
    case 'quienloharia':
      return applyWhoAction(state, playerId, action, now);
    case 'completalafrase':
      return applySentenceAction(state, playerId, action, now);
  }
}

function cloneBase<T extends RoadmapState>(state: T): T {
  const base = {
    ...state,
    rng: { ...state.rng },
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    rematchVotes: [...state.rematchVotes],
  };
  if (state.gameId === 'banderas') {
    return {
      ...base,
      questions: state.questions.map((question) => ({
        ...question,
        options: question.options.map((option) => ({ ...option })) as FlagQuestion['options'],
      })),
      flags: {
        ...state.flags,
        questionOrder: [...state.flags.questionOrder],
        submissions: { ...state.flags.submissions },
        scoreDeltas: state.flags.scoreDeltas ? { ...state.flags.scoreDeltas } : null,
      },
    } as T;
  }
  if (state.gameId === 'cifras') {
    return {
      ...base,
      questions: state.questions.map((question) => ({
        ...question,
        ...(question.kind === 'order'
          ? { items: question.items.map((item) => ({ ...item })) }
          : {}),
      })) as CifrasQuestion[],
      cifras: {
        ...state.cifras,
        questionOrder: [...state.cifras.questionOrder],
        submissions: { ...state.cifras.submissions },
        orderSubmissions: Object.fromEntries(
          Object.entries(state.cifras.orderSubmissions).map(([id, order]) => [id, [...order]]),
        ),
        scoreDeltas: state.cifras.scoreDeltas ? { ...state.cifras.scoreDeltas } : null,
        estimateResults: state.cifras.estimateResults ? { ...state.cifras.estimateResults } : null,
        orderResults: state.cifras.orderResults
          ? Object.fromEntries(
              Object.entries(state.cifras.orderResults).map(([id, result]) => [
                id,
                {
                  ...result,
                  order: result.order ? [...result.order] : null,
                  correctOrder: [...result.correctOrder],
                },
              ]),
            )
          : null,
      },
    } as T;
  }
  if (state.gameId === 'quienloharia') {
    return {
      ...base,
      questions: state.questions.map((question) => ({ ...question })),
      who: {
        ...state.who,
        questionOrder: [...state.who.questionOrder],
        submissions: { ...state.who.submissions },
        scoreDeltas: state.who.scoreDeltas ? { ...state.who.scoreDeltas } : null,
        voteCounts: state.who.voteCounts ? { ...state.who.voteCounts } : null,
      },
      history: state.history.map((entry) => ({
        ...entry,
        votes: { ...entry.votes },
        voteCounts: { ...entry.voteCounts },
        winners: [...entry.winners],
      })),
    } as T;
  }
  return {
    ...base,
    questions: state.questions.map((question) => ({
      ...question,
      acceptedAnswers: [...question.acceptedAnswers],
    })),
    sentence: {
      ...state.sentence,
      questionOrder: [...state.sentence.questionOrder],
      submissions: { ...state.sentence.submissions },
      hintUsed: { ...state.sentence.hintUsed },
      scoreDeltas: state.sentence.scoreDeltas ? { ...state.sentence.scoreDeltas } : null,
      results: state.sentence.results ? { ...state.sentence.results } : null,
    },
  } as T;
}

function bump<T extends RoadmapState>(state: T): T {
  const next = cloneBase(state);
  next.version = state.version + 1;
  return next;
}

function requireInputPlayer(state: RoadmapState, playerId: PlayerId): Result<RoadmapPlayer> {
  if (state.status !== 'playing' || state.phase !== 'input') return err('INVALID_ACTION');
  const player = findPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  return ok(player);
}

function allSubmitted(state: RoadmapState, submissions: Record<PlayerId, unknown>): boolean {
  const players = activePlayers(state);
  return (
    players.length > 0 && players.every((player) => submissions[player.playerId] !== undefined)
  );
}

function isHost(state: RoadmapState, playerId: PlayerId): boolean {
  const player = findPlayer(state, playerId);
  return player !== undefined && !player.left && player.seat === 0;
}

function answerDeadline(seconds: number, current: number | null, now: number): number | null {
  return current ?? (seconds > 0 ? now + seconds * 1000 : null);
}

function applyFlagsAction(
  state: BanderasState,
  playerId: PlayerId,
  action: GameAction,
  now: number,
): RoadmapActionResult {
  if (action.type === 'submitFlag') {
    const player = requireInputPlayer(state, playerId);
    if (!player.ok) return player;
    const question = flagQuestionById(state.flags.questionId, state.questions);
    if (
      !question.options.some((option) => option.id === action.optionId) ||
      state.flags.submissions[playerId] !== undefined
    )
      return err('INVALID_ACTION');
    if (state.flags.deadlineAt !== null && now >= state.flags.deadlineAt)
      return err('INVALID_ACTION');
    const firstSubmission = Object.keys(state.flags.submissions).length === 0;
    const next = bump(state);
    next.flags.submissions[playerId] = action.optionId;
    // La primera respuesta confirmada convierte el tiempo configurable de la
    // ronda en una ventana corta de presión para el resto. La elección se
    // confirma en la interfaz, así que solo este action puede abrirla.
    next.flags.deadlineAt =
      firstSubmission && next.config.answerTimeSeconds > 0
        ? now + BANDERAS_PRESSURE_SECONDS * 1000
        : next.flags.deadlineAt;
    const events: GameEvent[] = [{ t: 'roadmapAnswerSubmitted', playerId, gameId: 'banderas' }];
    if (allSubmitted(next, next.flags.submissions)) revealFlags(next, events);
    return ok({ state: next, events });
  }
  if (action.type === 'finishFlags') {
    if (!isHost(state, playerId) || state.status !== 'playing' || state.phase !== 'input')
      return err(isHost(state, playerId) ? 'INVALID_ACTION' : 'NOT_HOST');
    if (
      state.config.answerTimeSeconds > 0 &&
      (state.flags.deadlineAt === null || now < state.flags.deadlineAt)
    )
      return err('INVALID_ACTION');
    const next = bump(state);
    const events: GameEvent[] = [];
    revealFlags(next, events);
    return ok({ state: next, events });
  }
  if (action.type === 'nextRound') return nextRoadmapRound(state, playerId);
  return err('INVALID_ACTION');
}

function revealFlags(state: BanderasState, events: GameEvent[]): void {
  if (state.phase !== 'input') return;
  const question = flagQuestionById(state.flags.questionId, state.questions);
  const deltas = Object.fromEntries(
    activePlayers(state).map((player) => [player.playerId, 0]),
  ) as Record<PlayerId, number>;
  for (const player of activePlayers(state)) {
    const points = state.flags.submissions[player.playerId] === question.correctOptionId ? 1 : 0;
    player.score += points;
    deltas[player.playerId] = points;
  }
  state.flags.deadlineAt = null;
  state.flags.scoreDeltas = deltas;
  state.phase = 'reveal';
  events.push({ t: 'roadmapRevealed', gameId: 'banderas', round: state.round });
  finishRoadmapGame(state, events);
}

function applyCifrasAction(
  state: CifrasState,
  playerId: PlayerId,
  action: GameAction,
  now: number,
): RoadmapActionResult {
  if (action.type === 'submitNumber') {
    const player = requireInputPlayer(state, playerId);
    if (!player.ok) return player;
    const question = cifrasQuestionById(state.cifras.questionId, state.questions);
    if (
      question.kind !== 'estimate' ||
      !Number.isFinite(action.value) ||
      action.value < 0 ||
      state.cifras.submissions[playerId] !== undefined
    )
      return err('INVALID_ACTION');
    if (state.cifras.deadlineAt !== null && now >= state.cifras.deadlineAt)
      return err('INVALID_ACTION');
    const next = bump(state);
    next.cifras.submissions[playerId] = action.value;
    next.cifras.deadlineAt = answerDeadline(
      next.config.answerTimeSeconds,
      next.cifras.deadlineAt,
      now,
    );
    const events: GameEvent[] = [{ t: 'roadmapAnswerSubmitted', playerId, gameId: 'cifras' }];
    if (allSubmitted(next, next.cifras.submissions)) revealCifras(next, events);
    return ok({ state: next, events });
  }
  if (action.type === 'submitOrder') {
    const player = requireInputPlayer(state, playerId);
    if (!player.ok) return player;
    const question = cifrasQuestionById(state.cifras.questionId, state.questions);
    const ids = question.kind === 'order' ? question.items.map((item) => item.id) : [];
    if (
      question.kind !== 'order' ||
      state.cifras.orderSubmissions[playerId] !== undefined ||
      !sameSet(action.order, ids)
    )
      return err('INVALID_ACTION');
    if (state.cifras.deadlineAt !== null && now >= state.cifras.deadlineAt)
      return err('INVALID_ACTION');
    const next = bump(state);
    next.cifras.orderSubmissions[playerId] = [...action.order];
    next.cifras.deadlineAt = answerDeadline(
      next.config.answerTimeSeconds,
      next.cifras.deadlineAt,
      now,
    );
    const events: GameEvent[] = [{ t: 'roadmapAnswerSubmitted', playerId, gameId: 'cifras' }];
    if (allSubmitted(next, next.cifras.orderSubmissions)) revealCifras(next, events);
    return ok({ state: next, events });
  }
  if (action.type === 'finishCifras') {
    if (!isHost(state, playerId) || state.status !== 'playing' || state.phase !== 'input')
      return err(isHost(state, playerId) ? 'INVALID_ACTION' : 'NOT_HOST');
    if (
      state.config.answerTimeSeconds > 0 &&
      (state.cifras.deadlineAt === null || now < state.cifras.deadlineAt)
    )
      return err('INVALID_ACTION');
    const next = bump(state);
    const events: GameEvent[] = [];
    revealCifras(next, events);
    return ok({ state: next, events });
  }
  if (action.type === 'nextRound') return nextRoadmapRound(state, playerId);
  return err('INVALID_ACTION');
}

function revealCifras(state: CifrasState, events: GameEvent[]): void {
  if (state.phase !== 'input') return;
  const question = cifrasQuestionById(state.cifras.questionId, state.questions);
  const deltas = Object.fromEntries(
    activePlayers(state).map((player) => [player.playerId, 0]),
  ) as Record<PlayerId, number>;
  if (question.kind === 'estimate') {
    const results: NonNullable<CifrasState['cifras']['estimateResults']> = {};
    for (const player of activePlayers(state)) {
      const value = state.cifras.submissions[player.playerId];
      const errorPercent =
        value === undefined ? null : relativeErrorPercent(value, question.referenceValue);
      const points = errorPercent === null ? 0 : cifrasPointsForRelativeError(errorPercent);
      results[player.playerId] = { value: value ?? null, errorPercent, points };
      player.score += points;
      deltas[player.playerId] = points;
    }
    state.cifras.estimateResults = results;
    state.cifras.orderResults = null;
  } else {
    const correctOrder = [...question.items]
      .sort((a, b) =>
        question.direction === 'asc'
          ? a.value - b.value || a.id.localeCompare(b.id)
          : b.value - a.value || a.id.localeCompare(b.id),
      )
      .map((item) => item.id);
    const results: NonNullable<CifrasState['cifras']['orderResults']> = {};
    for (const player of activePlayers(state)) {
      const order = state.cifras.orderSubmissions[player.playerId];
      const correctPositions =
        order === undefined
          ? 0
          : order.reduce((count, id, index) => count + (id === correctOrder[index] ? 1 : 0), 0);
      const points =
        correctPositions +
        (order !== undefined &&
        sameSet(order, correctOrder) &&
        order.every((id, index) => id === correctOrder[index])
          ? 1
          : 0);
      results[player.playerId] = {
        order: order ? [...order] : null,
        correctOrder: [...correctOrder],
        correctPositions,
        points,
      };
      player.score += points;
      deltas[player.playerId] = points;
    }
    state.cifras.orderResults = results;
    state.cifras.estimateResults = null;
  }
  state.cifras.deadlineAt = null;
  state.cifras.scoreDeltas = deltas;
  state.phase = 'reveal';
  events.push({ t: 'roadmapRevealed', gameId: 'cifras', round: state.round });
  finishRoadmapGame(state, events);
}

export function relativeErrorPercent(value: number, reference: number): number {
  if (reference <= 0) return 100;
  return Number(((Math.abs(value - reference) / reference) * 100).toFixed(1));
}

export function cifrasPointsForRelativeError(errorPercent: number): number {
  if (errorPercent <= 0) return 100;
  if (errorPercent <= 1) return 98;
  if (errorPercent <= 5) return 90;
  if (errorPercent <= 10) return 80;
  if (errorPercent <= 25) return 50;
  if (errorPercent >= 50) return 0;
  return Math.round(((50 - errorPercent) / 25) * 50);
}

function applyWhoAction(
  state: QuienLoHariaState,
  playerId: PlayerId,
  action: GameAction,
  now: number,
): RoadmapActionResult {
  if (action.type === 'submitWhoVote') {
    const player = requireInputPlayer(state, playerId);
    if (!player.ok) return player;
    const target = findPlayer(state, action.targetPlayerId);
    if (
      !target ||
      target.left ||
      (!state.config.allowSelfVote && target.playerId === playerId) ||
      state.who.submissions[playerId] !== undefined
    )
      return err('INVALID_ACTION');
    if (state.who.deadlineAt !== null && now >= state.who.deadlineAt) return err('INVALID_ACTION');
    const next = bump(state);
    next.who.submissions[playerId] = target.playerId;
    next.who.deadlineAt = answerDeadline(next.config.answerTimeSeconds, next.who.deadlineAt, now);
    const events: GameEvent[] = [{ t: 'roadmapAnswerSubmitted', playerId, gameId: 'quienloharia' }];
    if (allSubmitted(next, next.who.submissions)) revealWho(next, events);
    return ok({ state: next, events });
  }
  if (action.type === 'finishWho') {
    if (!isHost(state, playerId) || state.status !== 'playing' || state.phase !== 'input')
      return err(isHost(state, playerId) ? 'INVALID_ACTION' : 'NOT_HOST');
    if (
      state.config.answerTimeSeconds > 0 &&
      (state.who.deadlineAt === null || now < state.who.deadlineAt)
    )
      return err('INVALID_ACTION');
    const next = bump(state);
    const events: GameEvent[] = [];
    revealWho(next, events);
    return ok({ state: next, events });
  }
  if (action.type === 'nextRound') return nextRoadmapRound(state, playerId);
  return err('INVALID_ACTION');
}

function revealWho(state: QuienLoHariaState, events: GameEvent[]): void {
  if (state.phase !== 'input') return;
  const counts = Object.fromEntries(
    activePlayers(state).map((player) => [player.playerId, 0]),
  ) as Record<PlayerId, number>;
  for (const targetId of Object.values(state.who.submissions)) {
    if (counts[targetId] !== undefined) counts[targetId] += 1;
  }
  const max = Math.max(...Object.values(counts), 0);
  const winners = Object.keys(counts).filter((id) => counts[id] === max) as PlayerId[];
  const deltas = Object.fromEntries(
    activePlayers(state).map((player) => [player.playerId, 0]),
  ) as Record<PlayerId, number>;
  if (state.config.competitive && winners.length === 1) {
    const winner = winners[0];
    for (const player of activePlayers(state)) {
      if (state.who.submissions[player.playerId] === winner) {
        player.score += 1;
        deltas[player.playerId] = 1;
      }
    }
  }
  state.who.voteCounts = counts;
  state.who.scoreDeltas = deltas;
  state.history.push({
    round: state.round,
    questionId: state.who.questionId,
    votes: { ...state.who.submissions },
    voteCounts: { ...counts },
    winners,
  });
  state.who.deadlineAt = null;
  state.phase = 'reveal';
  events.push({ t: 'roadmapRevealed', gameId: 'quienloharia', round: state.round });
  finishRoadmapGame(state, events);
}

function applySentenceAction(
  state: CompletaLaFraseState,
  playerId: PlayerId,
  action: GameAction,
  now: number,
): RoadmapActionResult {
  if (action.type === 'useSentenceHint') {
    const player = requireInputPlayer(state, playerId);
    if (!player.ok) return player;
    const question = sentenceQuestionById(state.sentence.questionId, state.questions);
    if (
      !state.config.hints ||
      !question.hint ||
      state.sentence.hintUsed[playerId] ||
      state.sentence.submissions[playerId] !== undefined
    )
      return err('INVALID_ACTION');
    const next = bump(state);
    next.sentence.hintUsed[playerId] = true;
    return ok({ state: next, events: [] });
  }
  if (action.type === 'submitSentence') {
    const player = requireInputPlayer(state, playerId);
    if (!player.ok) return player;
    const answer = action.answer.trim();
    if (!answer || state.sentence.submissions[playerId] !== undefined) return err('INVALID_ACTION');
    if (state.sentence.deadlineAt !== null && now >= state.sentence.deadlineAt)
      return err('INVALID_ACTION');
    const next = bump(state);
    next.sentence.submissions[playerId] = answer;
    next.sentence.deadlineAt = answerDeadline(
      next.config.answerTimeSeconds,
      next.sentence.deadlineAt,
      now,
    );
    const events: GameEvent[] = [
      { t: 'roadmapAnswerSubmitted', playerId, gameId: 'completalafrase' },
    ];
    if (allSubmitted(next, next.sentence.submissions)) revealSentence(next, events);
    return ok({ state: next, events });
  }
  if (action.type === 'finishSentence') {
    if (!isHost(state, playerId) || state.status !== 'playing' || state.phase !== 'input')
      return err(isHost(state, playerId) ? 'INVALID_ACTION' : 'NOT_HOST');
    if (
      state.config.answerTimeSeconds > 0 &&
      (state.sentence.deadlineAt === null || now < state.sentence.deadlineAt)
    )
      return err('INVALID_ACTION');
    const next = bump(state);
    const events: GameEvent[] = [];
    revealSentence(next, events);
    return ok({ state: next, events });
  }
  if (action.type === 'nextRound') return nextRoadmapRound(state, playerId);
  return err('INVALID_ACTION');
}

function revealSentence(state: CompletaLaFraseState, events: GameEvent[]): void {
  if (state.phase !== 'input') return;
  const question = sentenceQuestionById(state.sentence.questionId, state.questions);
  const deltas = Object.fromEntries(
    activePlayers(state).map((player) => [player.playerId, 0]),
  ) as Record<PlayerId, number>;
  const results: NonNullable<CompletaLaFraseState['sentence']['results']> = {};
  for (const player of activePlayers(state)) {
    const answer = state.sentence.submissions[player.playerId] ?? null;
    const correct =
      answer !== null &&
      question.acceptedAnswers.some(
        (accepted) => normalizeAnswer(answer) === normalizeAnswer(accepted),
      );
    const hintUsed = state.sentence.hintUsed[player.playerId] ?? false;
    const points = correct && !hintUsed ? 1 : 0;
    results[player.playerId] = { answer, correct, points, hintUsed };
    player.score += points;
    deltas[player.playerId] = points;
  }
  state.sentence.results = results;
  state.sentence.scoreDeltas = deltas;
  state.sentence.deadlineAt = null;
  state.phase = 'reveal';
  events.push({ t: 'roadmapRevealed', gameId: 'completalafrase', round: state.round });
  finishRoadmapGame(state, events);
}

export function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('es-ES')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function finishRoadmapGame(state: RoadmapState, events: GameEvent[]): void {
  const rounds = state.config.rounds;
  if (state.round < rounds) return;
  state.status = 'gameEnd';
  state.winnerId = decideWinner(state);
  if (state.winnerId) events.push({ t: 'gameOver', winnerId: state.winnerId });
}

function decideWinner(state: RoadmapState): PlayerId | null {
  const players = activePlayers(state);
  if (players.length === 0) return null;
  const highest = Math.max(...players.map((player) => player.score));
  const leaders = players.filter((player) => player.score === highest);
  return leaders.length === 1 ? (leaders[0]?.playerId ?? null) : null;
}

function nextRoadmapRound(state: RoadmapState, playerId: PlayerId): RoadmapActionResult {
  if (!isHost(state, playerId)) return err('NOT_HOST');
  if (state.status !== 'playing' || state.phase !== 'reveal' || state.round >= state.config.rounds)
    return err('INVALID_ACTION');
  const next = bump(state);
  next.phase = 'input';
  next.round += 1;
  next.rematchVotes = [];
  if (next.gameId === 'banderas') {
    const current = next.flags;
    const index = current.questionIndex + 1;
    next.flags = {
      questionOrder: [...current.questionOrder],
      questionIndex: index,
      questionId: nextId(current.questionOrder, index),
      submissions: {},
      deadlineAt: null,
      scoreDeltas: null,
    };
  } else if (next.gameId === 'cifras') {
    const current = next.cifras;
    const index = current.questionIndex + 1;
    next.cifras = {
      questionOrder: [...current.questionOrder],
      questionIndex: index,
      questionId: nextId(current.questionOrder, index),
      submissions: {},
      orderSubmissions: {},
      deadlineAt: null,
      scoreDeltas: null,
      estimateResults: null,
      orderResults: null,
    };
  } else if (next.gameId === 'quienloharia') {
    const current = next.who;
    const index = current.questionIndex + 1;
    next.who = {
      questionOrder: [...current.questionOrder],
      questionIndex: index,
      questionId: nextId(current.questionOrder, index),
      submissions: {},
      deadlineAt: null,
      scoreDeltas: null,
      voteCounts: null,
    };
  } else {
    const current = next.sentence;
    const index = current.questionIndex + 1;
    next.sentence = {
      questionOrder: [...current.questionOrder],
      questionIndex: index,
      questionId: nextId(current.questionOrder, index),
      submissions: {},
      hintUsed: {},
      deadlineAt: null,
      scoreDeltas: null,
      results: null,
    };
  }
  return ok({ state: next, events: [{ t: 'dealt', round: next.round }] });
}

function nextId(order: readonly string[], index: number): string {
  return order[index % order.length] ?? order[0] ?? '';
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length &&
    new Set(left).size === left.length &&
    left.every((value) => right.includes(value))
  );
}
