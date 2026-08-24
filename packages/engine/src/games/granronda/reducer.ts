import type { CreateInitialStateInput } from '../../core/types.ts';
import { hashSeed, mulberry32, shuffle } from '../../core/rng.ts';
import type {
  GameAction,
  GameEvent,
  GranRondaPowerupType,
  PlayerId,
  Result,
} from '@ronda/protocol';
import { err, ok } from '@ronda/protocol';
import { GRAN_RONDA_MINIGAMES, granRondaMiniGameById } from './content.ts';
import {
  GRAN_RONDA_BOARD,
  GRAN_RONDA_START_COINS,
  GRAN_RONDA_STAMP_COST,
  GRAN_RONDA_STAMP_TARGETS,
  GRAN_RONDA_POWERUP_COSTS,
  granRondaSpaceById,
} from './rules.ts';
import {
  activeGranRondaPlayers,
  granRondaPlayer,
  type GranRondaMiniGameState,
  type GranRondaMovementState,
  type GranRondaPlayer,
  type GranRondaResolutionState,
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
      powerups: { doubleRoll: 0, rivalPenalty: 0 },
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
    movement: null,
    resolution: null,
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
    case 'advanceGranRondaMovement':
      return advanceMovement(state, playerId);
    case 'chooseGranRondaPath':
      return choosePath(state, playerId, action.nextSpaceId);
    case 'continueGranRondaResolution':
      return continueResolution(state, playerId);
    case 'buyGranRondaSeal':
      return buySeal(state, playerId);
    case 'buyGranRondaPowerup':
      return buyPowerup(state, playerId, action.powerup);
    case 'useGranRondaPowerup':
      return usePowerup(state, playerId, action.powerup, action.targetPlayerId);
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

function rollDie(
  state: GranRondaState,
  playerId: PlayerId,
  diceCount: 1 | 2 = 1,
): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'movement') return err('INVALID_ACTION');
  const player = granRondaPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.turnSeat !== player.seat) return err('NOT_YOUR_TURN');

  const next = bump(state);
  const nextPlayer = granRondaPlayer(next, playerId);
  if (!nextPlayer) return err('PLAYER_NOT_IN_ROOM');
  if (diceCount === 2) {
    if (nextPlayer.powerups.doubleRoll <= 0) return err('INVALID_ACTION');
    nextPlayer.powerups.doubleRoll -= 1;
  }
  const dice = Array.from({ length: diceCount }, () => nextRandomInt(next, 1, 6));
  const rolled = dice.reduce((total, value) => total + value, 0);
  nextPlayer.lastRoll = rolled;
  next.movement = {
    playerId,
    roll: rolled,
    dice,
    path: [nextPlayer.position],
    remainingSteps: rolled,
    routeOptions: [],
    forcedNextSpaceId: null,
  };
  next.phase = 'moving';

  const currentSpace = granRondaSpaceById(nextPlayer.position);
  if (currentSpace && currentSpace.nextIds.length > 1) {
    next.phase = 'routeChoice';
    next.movement.routeOptions = [...currentSpace.nextIds];
  }
  return ok({ state: next, events: [] });
}

function advanceMovement(state: GranRondaState, playerId: PlayerId): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'moving') return err('INVALID_ACTION');
  const movement = state.movement;
  if (!movement || movement.playerId !== playerId || movement.remainingSteps <= 0) {
    return err('INVALID_ACTION');
  }
  const player = granRondaPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');

  const next = bump(state);
  const nextMovement = next.movement;
  const nextPlayer = granRondaPlayer(next, playerId);
  if (!nextMovement || !nextPlayer) return err('PLAYER_NOT_IN_ROOM');

  const currentSpace = granRondaSpaceById(nextPlayer.position);
  const nextSpaceId = nextMovement.forcedNextSpaceId ?? currentSpace?.nextIds[0];
  if (!nextSpaceId) return err('INVALID_ACTION');

  nextMovement.forcedNextSpaceId = null;
  nextMovement.routeOptions = [];
  nextPlayer.position = nextSpaceId;
  nextMovement.path.push(nextSpaceId);
  nextMovement.remainingSteps -= 1;

  if (nextMovement.remainingSteps <= 0) {
    resolveLanding(next, nextPlayer);
    next.phase = 'resolving';
    return ok({ state: next, events: [] });
  }

  const landedSpace = granRondaSpaceById(nextSpaceId);
  if (landedSpace && landedSpace.nextIds.length > 1) {
    next.phase = 'routeChoice';
    nextMovement.routeOptions = [...landedSpace.nextIds];
  } else {
    next.phase = 'moving';
  }
  return ok({ state: next, events: [] });
}

function choosePath(
  state: GranRondaState,
  playerId: PlayerId,
  nextSpaceId: string,
): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'routeChoice') return err('INVALID_ACTION');
  const movement = state.movement;
  const player = granRondaPlayer(state, playerId);
  if (!movement || movement.playerId !== playerId) return err('INVALID_ACTION');
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.turnSeat !== player.seat) return err('NOT_YOUR_TURN');

  const currentSpace = granRondaSpaceById(player.position);
  if (!currentSpace || !currentSpace.nextIds.includes(nextSpaceId)) return err('INVALID_ACTION');

  const next = bump(state);
  if (!next.movement) return err('INVALID_ACTION');
  next.movement.routeOptions = [];
  next.movement.forcedNextSpaceId = nextSpaceId;
  next.phase = 'moving';
  return ok({ state: next, events: [] });
}

function continueResolution(state: GranRondaState, playerId: PlayerId): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'resolving') return err('INVALID_ACTION');
  const movement = state.movement;
  const player = granRondaPlayer(state, playerId);
  if (!movement || movement.playerId !== playerId) return err('INVALID_ACTION');
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.turnSeat !== player.seat) return err('NOT_YOUR_TURN');

  const next = bump(state);
  next.resolution = null;
  next.movement = null;
  finishMovement(next, playerId);
  return ok({ state: next, events: [] });
}

function buySeal(state: GranRondaState, playerId: PlayerId): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'resolving') return err('INVALID_ACTION');
  const movement = state.movement;
  const player = granRondaPlayer(state, playerId);
  const resolution = state.resolution;
  if (!movement || movement.playerId !== playerId || !player) return err('INVALID_ACTION');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.turnSeat !== player.seat) return err('NOT_YOUR_TURN');
  if (
    !resolution ||
    resolution.kind !== 'sello' ||
    resolution.spaceId !== state.stampSpaceId ||
    player.coins < GRAN_RONDA_STAMP_COST
  ) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  const nextPlayer = granRondaPlayer(next, playerId);
  if (!nextPlayer || !next.resolution) return err('INVALID_ACTION');
  nextPlayer.coins -= GRAN_RONDA_STAMP_COST;
  nextPlayer.seals += 1;
  nextPlayer.score = nextPlayer.seals;
  const targetIndex = GRAN_RONDA_STAMP_TARGETS.indexOf(
    next.stampSpaceId as (typeof GRAN_RONDA_STAMP_TARGETS)[number],
  );
  next.stampSpaceId =
    GRAN_RONDA_STAMP_TARGETS[(targetIndex + 1) % GRAN_RONDA_STAMP_TARGETS.length] ??
    GRAN_RONDA_STAMP_TARGETS[0];
  next.resolution = {
    ...next.resolution,
    title: 'Sello comprado',
    message: `Has gastado ${GRAN_RONDA_STAMP_COST} Oros y consigues un Sello. El siguiente aparece en ${granRondaSpaceById(next.stampSpaceId)?.label ?? 'otra plaza'}.`,
    coinsDelta: -GRAN_RONDA_STAMP_COST,
    sealsDelta: 1,
  };
  return ok({ state: next, events: [] });
}

function buyPowerup(
  state: GranRondaState,
  playerId: PlayerId,
  powerup: GranRondaPowerupType,
): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'resolving') return err('INVALID_ACTION');
  const movement = state.movement;
  const player = granRondaPlayer(state, playerId);
  if (!movement || movement.playerId !== playerId || !player) return err('INVALID_ACTION');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (state.turnSeat !== player.seat) return err('NOT_YOUR_TURN');
  const cost = GRAN_RONDA_POWERUP_COSTS[powerup];
  if (player.coins < cost) return err('INVALID_ACTION');

  const next = bump(state);
  const nextPlayer = granRondaPlayer(next, playerId);
  if (!nextPlayer) return err('INVALID_ACTION');
  nextPlayer.coins -= cost;
  nextPlayer.powerups[powerup] += 1;
  return ok({ state: next, events: [] });
}

function usePowerup(
  state: GranRondaState,
  playerId: PlayerId,
  powerup: GranRondaPowerupType,
  targetPlayerId?: PlayerId,
): GranRondaActionResult {
  if (powerup === 'doubleRoll') return rollDie(state, playerId, 2);
  if (state.status !== 'playing' || state.phase !== 'movement') return err('INVALID_ACTION');
  const player = granRondaPlayer(state, playerId);
  if (!player || player.left) return err('PLAYER_NOT_IN_ROOM');
  if (state.turnSeat !== player.seat || player.powerups.rivalPenalty <= 0) {
    return err('INVALID_ACTION');
  }
  if (!targetPlayerId || targetPlayerId === playerId) return err('INVALID_ACTION');
  const target = granRondaPlayer(state, targetPlayerId);
  if (!target || target.left) return err('INVALID_ACTION');

  const next = bump(state);
  const nextPlayer = granRondaPlayer(next, playerId);
  const nextTarget = granRondaPlayer(next, targetPlayerId);
  if (!nextPlayer || !nextTarget) return err('INVALID_ACTION');
  nextPlayer.powerups.rivalPenalty -= 1;
  nextTarget.coins = Math.max(0, nextTarget.coins - 2);
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
  if (
    state.status !== 'playing' ||
    state.phase !== 'minigameReveal'
  ) {
    return err('INVALID_ACTION');
  }
  if (!isHost(state, playerId)) return err('NOT_HOST');
  if (state.round >= state.config.rounds) return err('INVALID_ACTION');

  const next = bump(state);
  next.round += 1;
  next.phase = 'movement';
  next.movedPlayerIds = [];
  next.turnSeat = firstSeatForRound(next);
  next.movement = null;
  next.resolution = null;
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

  let coinsDelta = 0;
  let sealsDelta = 0;
  let title = space.label;
  let message = 'La ficha ha llegado a esta casilla.';

  if (space.type === 'oros') {
    coinsDelta = 3;
    player.coins += coinsDelta;
    title = 'Has encontrado Oros';
    message = 'La casilla te entrega 3 Oros.';
  }
  if (space.type === 'perdida') {
    coinsDelta = Math.max(-2, -player.coins);
    player.coins = Math.max(0, player.coins - 2);
    title = 'Senda de Pérdida';
    message = 'La casilla resta 2 Oros, sin bajar de cero.';
  }
  if (space.type === 'evento') {
    coinsDelta = 1;
    player.coins += coinsDelta;
    title = 'Cruce de la Ronda';
    message = 'El cruce te concede 1 Oro. En esta llegada puedes comprar un poder para la siguiente vuelta.';
  }
  if (space.type === 'atajo') {
    coinsDelta = 2;
    player.coins += coinsDelta;
    title = 'Atajo';
    message = 'El atajo premia la decisión con 2 Oros.';
  }

  if (space.type === 'sello') {
    if (space.id === state.stampSpaceId) {
      title = 'Sello disponible';
      message =
        player.coins >= GRAN_RONDA_STAMP_COST
          ? `Cuesta ${GRAN_RONDA_STAMP_COST} Oros. Puedes comprarlo ahora o guardar tus Oros.`
          : `Necesitas ${GRAN_RONDA_STAMP_COST} Oros para comprarlo; ahora tienes ${player.coins}.`;
    } else {
      title = 'Plaza de Sello';
      message = `Aquí no está el Sello activo. El objetivo actual es ${granRondaSpaceById(state.stampSpaceId)?.label ?? 'otra plaza'}.`;
    }
  }

  state.resolution = {
    kind: space.type,
    spaceId: space.id,
    title,
    message,
    coinsDelta,
    sealsDelta,
  };
}

function finishMovement(state: GranRondaState, playerId: PlayerId): void {
  if (!state.movedPlayerIds.includes(playerId)) state.movedPlayerIds.push(playerId);
  const active = activeGranRondaPlayers(state).sort((left, right) => left.seat - right.seat);
  if (state.movedPlayerIds.length >= active.length) {
    // Cada ronda termina con un juego compartido. El anfitrión solo puede
    // revelar cuando han respondido todos o cuando decide cerrar la ventana.
    state.phase = 'minigameInput';
    state.turnSeat = null;
    return;
  }

  const nextPlayer = active.find((player) => !state.movedPlayerIds.includes(player.playerId));
  state.turnSeat = nextPlayer?.seat ?? null;
  state.phase = 'movement';
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
  const movement: GranRondaMovementState | null = state.movement
    ? {
        ...state.movement,
        dice: [...state.movement.dice],
        path: [...state.movement.path],
        routeOptions: [...state.movement.routeOptions],
      }
    : null;
  const resolution: GranRondaResolutionState | null = state.resolution
    ? { ...state.resolution }
    : null;
  return {
    ...state,
    rng: { ...state.rng },
    players: state.players.map((player) => ({
      ...player,
      hand: [...player.hand],
      powerups: { ...player.powerups },
    })),
    board: state.board.map((space) => ({ ...space, nextIds: [...space.nextIds] })),
    movedPlayerIds: [...state.movedPlayerIds],
    movement,
    resolution,
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
