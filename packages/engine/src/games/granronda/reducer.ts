import type { CreateInitialStateInput } from '../../core/types.ts';
import { hashSeed, mulberry32, shuffle } from '../../core/rng.ts';
import type { GameAction, GameEvent, PlayerId, Result } from '@ronda/protocol';
import { err, ok } from '@ronda/protocol';
import { GRAN_RONDA_MINIGAMES, granRondaMiniGameById } from './content.ts';
import {
  GRAN_RONDA_BOARD,
  GRAN_RONDA_START_COINS,
  GRAN_RONDA_STAMP_COST,
  GRAN_RONDA_STAMP_TARGETS,
  granRondaSpaceById,
} from './rules.ts';
import {
  activeGranRondaPlayers,
  granRondaPlayer,
  type GranRondaMiniGameState,
  type GranRondaPlayer,
  type GranRondaState,
} from './state.ts';

export type GranRondaActionResult = Result<{ state: GranRondaState; events: GameEvent[] }>;

type GranRondaInitialStateInput = CreateInitialStateInput & {
  roomCode?: string;
  players: (CreateInitialStateInput['players'][number] & { isBot?: boolean })[];
};

export function createInitialState(input: GranRondaInitialStateInput): GranRondaState {
  if (input.config.gameId !== 'granronda') {
    throw new Error('Configuración inválida para La Gran Ronda');
  }

  const questionOrderResult = shuffle(
    GRAN_RONDA_MINIGAMES.map((question) => question.id),
    input.seed,
    0,
  );
  const firstQuestion = GRAN_RONDA_MINIGAMES[0];
  if (!firstQuestion) throw new Error('Falta contenido de La Gran Ronda');
  const players = [...input.players]
    .sort((left, right) => left.seat - right.seat)
    .map<GranRondaPlayer>((player) => ({
      playerId: player.playerId,
      nick: player.nick,
      seat: player.seat,
      isBot: player.isBot ?? false,
      hand: [],
      position: 'salida',
      coins: GRAN_RONDA_START_COINS,
      seals: 0,
      score: 0,
      lastRoll: null,
      lastSpaceId: null,
      left: false,
    }));
  const firstPlayer = players[0];
  const miniGame: GranRondaMiniGameState = {
    questionOrder: questionOrderResult.items,
    questionIndex: 0,
    questionId: questionOrderResult.items[0] ?? firstQuestion.id,
    submissions: {},
    scoreDeltas: null,
  };

  return {
    version: 0,
    status: 'playing',
    phase: 'movement',
    config: input.config,
    gameId: 'granronda',
    roomCode: input.roomCode ?? '',
    rng: { seed: input.seed, calls: questionOrderResult.calls },
    round: 1,
    turnSeat: firstPlayer?.seat ?? null,
    players,
    board: GRAN_RONDA_BOARD.map((space) => ({ ...space, nextIds: [...space.nextIds] })),
    stampSpaceId: GRAN_RONDA_STAMP_TARGETS[0],
    movedPlayerIds: [],
    miniGame,
    winnerId: null,
    rematchVotes: [],
  };
}

export function applyAction(
  state: GranRondaState,
  playerId: PlayerId,
  action: GameAction,
  now: number,
): GranRondaActionResult {
  void now;
  switch (action.type) {
    case 'rollGranRonda':
      return rollDie(state, playerId);
    case 'chooseGranRondaPath':
      return choosePath(state, playerId, action.nextSpaceId);
    case 'submitGranRondaAnswer':
      return submitAnswer(state, playerId, action.optionId);
    case 'finishGranRondaMiniGame':
      return finishMiniGame(state, playerId);
    case 'nextRound':
      return nextRound(state, playerId);
    default:
      return err('INVALID_ACTION');
  }
}

function rollDie(state: GranRondaState, playerId: PlayerId): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'movement') return err('INVALID_ACTION');
  const player = granRondaPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.turnSeat !== player.seat) return err('NOT_YOUR_TURN');

  const next = bump(state);
  const rolled = nextRandomInt(next, 1, 6);
  const nextPlayer = granRondaPlayer(next, playerId);
  if (!nextPlayer) return err('PLAYER_NOT_IN_ROOM');
  nextPlayer.lastRoll = rolled;

  let position = nextPlayer.position;
  for (let step = 0; step < rolled; step += 1) {
    const space = granRondaSpaceById(position);
    const nextId = space?.nextIds[0];
    if (!nextId) break;
    position = nextId;
  }
  nextPlayer.position = position;

  const landingSpace = granRondaSpaceById(position);
  if (landingSpace && landingSpace.nextIds.length > 1) {
    next.phase = 'routeChoice';
    return ok({ state: next, events: [] });
  }

  resolveLanding(next, nextPlayer);
  finishMovement(next, playerId);
  return ok({ state: next, events: [] });
}

function choosePath(
  state: GranRondaState,
  playerId: PlayerId,
  nextSpaceId: string,
): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'routeChoice') return err('INVALID_ACTION');
  const player = granRondaPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.turnSeat !== player.seat) return err('NOT_YOUR_TURN');

  const currentSpace = granRondaSpaceById(player.position);
  if (!currentSpace || !currentSpace.nextIds.includes(nextSpaceId)) return err('INVALID_ACTION');

  const next = bump(state);
  const nextPlayer = granRondaPlayer(next, playerId);
  if (!nextPlayer) return err('PLAYER_NOT_IN_ROOM');
  nextPlayer.position = nextSpaceId;
  resolveLanding(next, nextPlayer);
  finishMovement(next, playerId);
  return ok({ state: next, events: [] });
}

function submitAnswer(
  state: GranRondaState,
  playerId: PlayerId,
  optionId: string,
): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'minigameInput') return err('INVALID_ACTION');
  const player = granRondaPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  const question = granRondaMiniGameById(state.miniGame.questionId);
  if (!question.options.some((option) => option.id === optionId)) return err('INVALID_ACTION');
  if (state.miniGame.submissions[playerId] !== undefined) return err('INVALID_ACTION');

  const next = bump(state);
  next.miniGame.submissions[playerId] = optionId;
  if (allActivePlayersAnswered(next)) revealMiniGame(next);
  return ok({ state: next, events: [] });
}

function finishMiniGame(state: GranRondaState, playerId: PlayerId): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'minigameInput') return err('INVALID_ACTION');
  if (!isHost(state, playerId)) return err('NOT_HOST');
  const next = bump(state);
  revealMiniGame(next);
  return ok({ state: next, events: [] });
}

function nextRound(state: GranRondaState, playerId: PlayerId): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'minigameReveal') return err('INVALID_ACTION');
  if (!isHost(state, playerId)) return err('NOT_HOST');
  if (state.round >= state.config.rounds) return err('INVALID_ACTION');

  const next = bump(state);
  next.round += 1;
  next.phase = 'movement';
  next.movedPlayerIds = [];
  next.turnSeat = firstSeatForRound(next);
  next.miniGame.questionIndex =
    (next.miniGame.questionIndex + 1) % next.miniGame.questionOrder.length;
  next.miniGame.questionId =
    next.miniGame.questionOrder[next.miniGame.questionIndex] ?? next.miniGame.questionId;
  next.miniGame.submissions = {};
  next.miniGame.scoreDeltas = null;
  next.rematchVotes = [];
  return ok({ state: next, events: [] });
}

function resolveLanding(state: GranRondaState, player: GranRondaPlayer): void {
  const space = granRondaSpaceById(player.position);
  if (!space) return;
  player.lastSpaceId = space.id;

  if (space.type === 'oros') player.coins += 3;
  if (space.type === 'perdida') player.coins = Math.max(0, player.coins - 2);
  if (space.type === 'evento') player.coins += 1;
  if (space.type === 'atajo') player.coins += 2;

  if (space.type === 'sello' && space.id === state.stampSpaceId && player.coins >= GRAN_RONDA_STAMP_COST) {
    player.coins -= GRAN_RONDA_STAMP_COST;
    player.seals += 1;
    player.score = player.seals;
    const targetIndex = GRAN_RONDA_STAMP_TARGETS.indexOf(
      state.stampSpaceId as (typeof GRAN_RONDA_STAMP_TARGETS)[number],
    );
    state.stampSpaceId =
      GRAN_RONDA_STAMP_TARGETS[(targetIndex + 1) % GRAN_RONDA_STAMP_TARGETS.length] ??
      GRAN_RONDA_STAMP_TARGETS[0];
  }
}

function finishMovement(state: GranRondaState, playerId: PlayerId): void {
  if (!state.movedPlayerIds.includes(playerId)) state.movedPlayerIds.push(playerId);
  const active = activeGranRondaPlayers(state).sort((left, right) => left.seat - right.seat);
  if (state.movedPlayerIds.length >= active.length) {
    state.phase = 'minigameInput';
    state.turnSeat = null;
    return;
  }

  const nextPlayer = active.find((player) => !state.movedPlayerIds.includes(player.playerId));
  state.turnSeat = nextPlayer?.seat ?? null;
}

function revealMiniGame(state: GranRondaState): void {
  const question = granRondaMiniGameById(state.miniGame.questionId);
  const scoreDeltas: Record<PlayerId, number> = {};
  for (const player of activeGranRondaPlayers(state)) {
    const answer = state.miniGame.submissions[player.playerId];
    const delta = answer === question.correctOptionId ? 4 : answer === undefined ? 0 : 1;
    scoreDeltas[player.playerId] = delta;
    player.coins += delta;
  }
  state.miniGame.scoreDeltas = scoreDeltas;
  state.phase = 'minigameReveal';
  if (state.round >= state.config.rounds) {
    state.status = 'gameEnd';
    state.winnerId = decideWinner(state);
  }
}

function allActivePlayersAnswered(state: GranRondaState): boolean {
  const active = activeGranRondaPlayers(state);
  return active.length > 0 && active.every((player) => state.miniGame.submissions[player.playerId] !== undefined);
}

function decideWinner(state: GranRondaState): PlayerId | null {
  return (
    [...activeGranRondaPlayers(state)].sort(
      (left, right) => right.seals - left.seals || right.coins - left.coins || left.seat - right.seat,
    )[0]?.playerId ?? null
  );
}

function firstSeatForRound(state: GranRondaState): number | null {
  const active = activeGranRondaPlayers(state).sort((left, right) => left.seat - right.seat);
  return active[(state.round - 1) % active.length]?.seat ?? null;
}

function isHost(state: GranRondaState, playerId: PlayerId): boolean {
  const player = granRondaPlayer(state, playerId);
  return player !== undefined && !player.left && player.seat === 0;
}

function nextRandomInt(state: GranRondaState, min: number, max: number): number {
  const random = mulberry32(hashSeed(state.rng.seed));
  for (let index = 0; index < state.rng.calls; index += 1) random();
  const value = min + Math.floor(random() * (max - min + 1));
  state.rng.calls += 1;
  return value;
}

function bump(state: GranRondaState): GranRondaState {
  return {
    ...state,
    rng: { ...state.rng },
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    board: state.board.map((space) => ({ ...space, nextIds: [...space.nextIds] })),
    movedPlayerIds: [...state.movedPlayerIds],
    miniGame: {
      ...state.miniGame,
      questionOrder: [...state.miniGame.questionOrder],
      submissions: { ...state.miniGame.submissions },
      scoreDeltas: state.miniGame.scoreDeltas ? { ...state.miniGame.scoreDeltas } : null,
    },
    rematchVotes: [...state.rematchVotes],
    version: state.version + 1,
  };
}
