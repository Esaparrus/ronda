import type { CreateInitialStateInput } from '../../core/types.ts';
import { hashSeed, mulberry32, shuffle } from '../../core/rng.ts';
import { DEFAULT_PLAYER_TOKEN_ICON, PLAYER_TOKEN_ICONS } from '@ronda/protocol';
import type {
  GameAction,
  GameEvent,
  GranRondaEmbeddedGameAction,
  GranRondaMiniGameId,
  GranRondaPowerupType,
  PlayerId,
  Result,
} from '@ronda/protocol';
import {
  DEFAULT_BANDERAS_CONFIG,
  DEFAULT_BRISCA_CONFIG,
  DEFAULT_CIFRAS_CONFIG,
  DEFAULT_CINQUILLO_CONFIG,
  DEFAULT_COMPLETA_LA_FRASE_CONFIG,
  DEFAULT_COLORES_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_ESCOBA_CONFIG,
  DEFAULT_ESCALA_CONFIG,
  DEFAULT_LA_RONDA_CONFIG,
  DEFAULT_MATIZ_CONFIG,
  DEFAULT_MAYORIA_CONFIG,
  DEFAULT_MUSICAL_CONFIG,
  DEFAULT_ORDEN_CONFIG,
  DEFAULT_POCHA_CONFIG,
  DEFAULT_PRECIO_JUSTO_CONFIG,
  DEFAULT_SIETE_Y_MEDIA_CONFIG,
  DEFAULT_TUTE_CONFIG,
  DEFAULT_QUIEN_LO_HARIA_CONFIG,
  err,
  ok,
} from '@ronda/protocol';
import { applyClassicAction, createClassicState } from '../classics/reducer.ts';
import {
  applyAction as applyChinchonAction,
  createInitialState as createChinchonState,
} from '../chinchon/reducer.ts';
import {
  applyAction as applyPochaAction,
  createInitialState as createPochaState,
} from '../pocha/reducer.ts';
import {
  applyAction as applyMusicalAction,
  createInitialState as createMusicalState,
} from '../musical/reducer.ts';
import { applyAction as applyPartyAction, createPartyState } from '../party/reducer.ts';
import {
  applyAction as applyPrecioJustoAction,
  createInitialState as createPrecioJustoState,
} from '../preciojusto/reducer.ts';
import {
  applyAction as applyRoadmapAction,
  createBanderasState,
  createCifrasState,
  createCompletaLaFraseState,
  createQuienLoHariaState,
} from '../roadmap/reducer.ts';
import { applyRondaAction, createRondaState } from '../laronda/reducer.ts';
import {
  GRAN_RONDA_DUEL_MINIGAME_IDS,
  GRAN_RONDA_MINIGAMES,
  granRondaMiniGameById,
  granRondaMiniGamesForPlayerCount,
} from './content.ts';
import {
  GRAN_RONDA_BOARD,
  GRAN_RONDA_START_COINS,
  GRAN_RONDA_STAMP_COST,
  GRAN_RONDA_STAMP_MAX_COST,
  GRAN_RONDA_STAMP_MIN_COST,
  GRAN_RONDA_STAMP_TARGETS,
  GRAN_RONDA_TRAP_TARGETS,
  GRAN_RONDA_POWERUP_COSTS,
  granRondaBridgeDestination,
  granRondaRouteChoicePaths,
  granRondaSpaceById,
} from './rules.ts';
import {
  activeGranRondaPlayers,
  granRondaPlayer,
  type GranRondaMiniGameResult,
  type GranRondaMiniGameState,
  type GranRondaMiniPlayerState,
  type GranRondaEmbeddedGameState,
  type GranRondaDuelState,
  type GranRondaMovementState,
  type GranRondaPlayer,
  type GranRondaResolutionState,
  type GranRondaState,
} from './state.ts';
import type { PartyState } from '../party/state.ts';
import type { RoadmapState } from '../roadmap/state.ts';

export type GranRondaActionResult = Result<{ state: GranRondaState; events: GameEvent[] }>;

type GranRondaInitialStateInput = CreateInitialStateInput & {
  roomCode?: string;
  players: (CreateInitialStateInput['players'][number] & { isBot?: boolean })[];
};

export function createInitialState(input: GranRondaInitialStateInput): GranRondaState {
  if (input.config.gameId !== 'granronda') {
    throw new Error('Configuración inválida para La Gran Ronda');
  }

  const availableMiniGames = granRondaMiniGamesForPlayerCount(input.players.length);
  const questionOrderResult = shuffle(
    availableMiniGames.map((question) => question.id),
    input.seed,
    0,
  );
  const trapOrderResult = shuffle(GRAN_RONDA_TRAP_TARGETS, input.seed, questionOrderResult.calls);
  const firstQuestion = availableMiniGames[0] ?? GRAN_RONDA_MINIGAMES[0];
  if (!firstQuestion) throw new Error('Falta contenido de La Gran Ronda');
  const players = [...input.players]
    .sort((left, right) => left.seat - right.seat)
    .map<GranRondaPlayer>((player) => ({
      playerId: player.playerId,
      nick: player.nick,
      seat: player.seat,
      isBot: player.isBot ?? false,
      tokenIcon:
        player.tokenIcon ??
        PLAYER_TOKEN_ICONS[player.seat % PLAYER_TOKEN_ICONS.length] ??
        DEFAULT_PLAYER_TOKEN_ICON,
      hand: [],
      position: 'salida',
      coins: GRAN_RONDA_START_COINS,
      seals: 0,
      skipTurns: 0,
      powerups: { doubleRoll: 0, rivalPenalty: 0, goldDuel: 0 },
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
    playerStates: Object.fromEntries(
      players.map((player) => [
        player.playerId,
        { score: 0, lastCard: null, finished: false, busted: false, actions: 0, completedAt: null },
      ]),
    ) as Record<PlayerId, GranRondaMiniPlayerState>,
    targetOptionId: null,
    scoreDeltas: null,
    results: null,
    embeddedGame: null,
  };

  return {
    version: 0,
    status: 'playing',
    phase: 'movement',
    config: input.config,
    gameId: 'granronda',
    roomCode: input.roomCode ?? '',
    rng: { seed: input.seed, calls: trapOrderResult.calls },
    round: 1,
    turnSeat: firstPlayer?.seat ?? null,
    players,
    board: GRAN_RONDA_BOARD.map((space) => ({ ...space, nextIds: [...space.nextIds] })),
    stampSpaceId: GRAN_RONDA_STAMP_TARGETS[0],
    stampCost: GRAN_RONDA_STAMP_COST,
    stampValue: 1,
    trapSpaceIds: trapOrderResult.items.slice(0, trapCountForPlayerCount(players.length)),
    movedPlayerIds: [],
    movement: null,
    resolution: null,
    lastInteraction: null,
    duel: null,
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
      return usePowerup(state, playerId, action.powerup, action.targetPlayerId, action.wager);
    case 'submitGranRondaMiniGameAction':
      return submitEmbeddedGameAction(state, playerId, action.action, now);
    case 'submitGranRondaAnswer':
      return submitAnswer(state, playerId, action.optionId, now);
    case 'finishGranRondaMiniGame':
      return finishMiniGame(state, playerId);
    case 'continueGranRondaDuel':
      return continueDuel(state, playerId);
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
  next.lastInteraction = null;
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
    routePaths: {},
    plannedPath: [],
  };
  if (!prepareNextMovementSegment(next)) return err('INTERNAL');
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

  const nextSpaceId = nextMovement.plannedPath.shift();
  if (!nextSpaceId) return err('INVALID_ACTION');

  nextMovement.routeOptions = [];
  nextPlayer.position = nextSpaceId;
  nextMovement.path.push(nextSpaceId);
  nextMovement.remainingSteps -= 1;

  const landedSpace = granRondaSpaceById(nextSpaceId);
  // La tienda se abre al pasar y, al cerrarla, conserva los pasos pendientes.
  if (landedSpace?.type === 'tienda') {
    resolveLanding(next, nextPlayer);
    next.phase = 'resolving';
    return ok({ state: next, events: [] });
  }

  if (nextMovement.remainingSteps <= 0) {
    resolveLanding(next, nextPlayer);
    next.phase = 'resolving';
    return ok({ state: next, events: [] });
  }

  if (nextMovement.plannedPath.length > 0) {
    next.phase = 'moving';
  } else if (!prepareNextMovementSegment(next)) {
    return err('INTERNAL');
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

  if (!movement.routeOptions.includes(nextSpaceId)) return err('INVALID_ACTION');

  const next = bump(state);
  if (!next.movement) return err('INVALID_ACTION');
  const route = next.movement.routePaths[nextSpaceId];
  if (!route || route[0] !== player.position || route[1] !== nextSpaceId) {
    return err('INVALID_ACTION');
  }
  next.movement.routeOptions = [];
  next.movement.routePaths = {};
  next.movement.plannedPath = route.slice(1);
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

  const resumesAfterShop = state.resolution?.kind === 'tienda' && movement.remainingSteps > 0;
  const next = bump(state);
  next.resolution = null;
  if (resumesAfterShop) {
    if (next.movement?.plannedPath.length) {
      next.phase = 'moving';
    } else if (!prepareNextMovementSegment(next)) {
      return err('INTERNAL');
    }
    return ok({ state: next, events: [] });
  }
  next.movement = null;
  finishMovement(next, playerId);
  return ok({ state: next, events: [] });
}

/**
 * Prepara solo el tramo hasta el siguiente cruce. Al inicio no hay arista de
 * llegada y por eso aparecen tanto el sentido horario como el antihorario.
 */
function prepareNextMovementSegment(state: GranRondaState): boolean {
  const movement = state.movement;
  if (!movement || movement.remainingSteps <= 0) return false;
  const currentSpaceId = movement.path[movement.path.length - 1];
  if (!currentSpaceId) return false;
  const previousSpaceId = movement.path[movement.path.length - 2] ?? null;
  const choices = granRondaRouteChoicePaths(
    state.board,
    currentSpaceId,
    movement.remainingSteps,
    previousSpaceId,
  );
  if (choices.length === 0) return false;

  movement.routePaths = Object.fromEntries(
    choices.map((choice) => [choice.nextSpaceId, [...choice.path]]),
  );
  movement.plannedPath = [];
  if (choices.length === 1) {
    movement.routeOptions = [];
    movement.plannedPath = choices[0]?.path.slice(1) ?? [];
    state.phase = 'moving';
  } else {
    movement.routeOptions = choices.map((choice) => choice.nextSpaceId);
    state.phase = 'routeChoice';
  }
  return true;
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
    player.coins < state.stampCost
  ) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  const nextPlayer = granRondaPlayer(next, playerId);
  if (!nextPlayer || !next.resolution) return err('INVALID_ACTION');
  const paid = next.stampCost;
  const sealReward = next.stampValue;
  nextPlayer.coins -= paid;
  nextPlayer.seals += sealReward;
  nextPlayer.score = nextPlayer.seals;
  next.stampSpaceId = nextRandomStampTarget(next, next.stampSpaceId);
  next.stampCost = nextRandomInt(next, GRAN_RONDA_STAMP_MIN_COST, GRAN_RONDA_STAMP_MAX_COST);
  next.stampValue = stampValueForRound(next);
  next.resolution = {
    ...next.resolution,
    title: 'Sello comprado',
    message: `${nextPlayer.nick} ha gastado ${paid} Oros y consigue ${sealReward === 1 ? 'un Sello' : `${sealReward} Sellos`}. La siguiente oferta aparece en ${granRondaSpaceById(next.stampSpaceId)?.label ?? 'otra plaza'} por ${next.stampCost} Oros.`,
    coinsDelta: -paid,
    sealsDelta: sealReward,
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
  if (state.resolution?.kind !== 'tienda') return err('INVALID_ACTION');
  if (state.resolution.purchasedPowerups?.includes(powerup)) return err('INVALID_ACTION');
  const cost = GRAN_RONDA_POWERUP_COSTS[powerup];
  if (player.coins < cost) return err('INVALID_ACTION');

  const next = bump(state);
  const nextPlayer = granRondaPlayer(next, playerId);
  if (!nextPlayer) return err('INVALID_ACTION');
  nextPlayer.coins -= cost;
  nextPlayer.powerups[powerup] += 1;
  if (next.resolution) {
    next.resolution.purchasedPowerups = [...(next.resolution.purchasedPowerups ?? []), powerup];
  }
  return ok({ state: next, events: [] });
}

function usePowerup(
  state: GranRondaState,
  playerId: PlayerId,
  powerup: GranRondaPowerupType,
  targetPlayerId?: PlayerId,
  wager?: number,
): GranRondaActionResult {
  if (powerup === 'doubleRoll') return rollDie(state, playerId, 2);
  if (state.status !== 'playing' || state.phase !== 'movement') return err('INVALID_ACTION');
  const player = granRondaPlayer(state, playerId);
  if (!player || player.left) return err('PLAYER_NOT_IN_ROOM');
  if (state.turnSeat !== player.seat || player.powerups[powerup] <= 0) {
    return err('INVALID_ACTION');
  }
  if (!targetPlayerId || targetPlayerId === playerId) return err('INVALID_ACTION');
  const target = granRondaPlayer(state, targetPlayerId);
  if (!target || target.left) return err('INVALID_ACTION');

  const next = bump(state);
  const nextPlayer = granRondaPlayer(next, playerId);
  const nextTarget = granRondaPlayer(next, targetPlayerId);
  if (!nextPlayer || !nextTarget) return err('INVALID_ACTION');
  if (powerup === 'rivalPenalty') {
    const stolen = Math.min(2, nextTarget.coins);
    nextPlayer.powerups.rivalPenalty -= 1;
    nextTarget.coins -= stolen;
    nextPlayer.coins += stolen;
    next.lastInteraction = {
      kind: 'steal',
      actorPlayerId: playerId,
      targetPlayerId,
      coinsTransferred: stolen,
      wager: null,
      actorRoll: null,
      targetRoll: null,
      winnerId: stolen > 0 ? playerId : null,
    };
    return ok({ state: next, events: [] });
  }

  const duelWager = wager ?? 1;
  if (
    !Number.isInteger(duelWager) ||
    duelWager < 1 ||
    duelWager > 5 ||
    nextPlayer.coins < duelWager ||
    nextTarget.coins < duelWager
  ) {
    return err('INVALID_ACTION');
  }
  nextPlayer.powerups.goldDuel -= 1;
  const duelGameId =
    GRAN_RONDA_DUEL_MINIGAME_IDS[nextRandomInt(next, 0, GRAN_RONDA_DUEL_MINIGAME_IDS.length - 1)];
  if (!duelGameId) return err('INTERNAL');
  const duel: GranRondaDuelState = {
    actorPlayerId: playerId,
    targetPlayerId,
    wager: duelWager,
    gameId: duelGameId,
    scheduledQuestionId: next.miniGame.questionId,
  };
  next.duel = duel;
  next.lastInteraction = null;
  next.miniGame.questionId = duelGameId;
  prepareMiniGame(next, [playerId, targetPlayerId]);
  next.phase = 'minigameInput';
  return ok({ state: next, events: [] });
}

function continueDuel(state: GranRondaState, playerId: PlayerId): GranRondaActionResult {
  const duel = state.duel;
  if (
    state.status !== 'playing' ||
    state.phase !== 'minigameReveal' ||
    !duel ||
    duel.actorPlayerId !== playerId
  ) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  const scheduledQuestionId = next.duel?.scheduledQuestionId;
  if (!scheduledQuestionId) return err('INVALID_ACTION');
  next.duel = null;
  next.miniGame.questionId = scheduledQuestionId;
  next.miniGame.submissions = {};
  next.miniGame.playerStates = {};
  next.miniGame.targetOptionId = null;
  next.miniGame.scoreDeltas = null;
  next.miniGame.results = null;
  next.miniGame.embeddedGame = null;
  next.phase = 'movement';
  return ok({ state: next, events: [] });
}

function submitAnswer(
  state: GranRondaState,
  playerId: PlayerId,
  optionId: string,
  now: number,
): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'minigameInput') return err('INVALID_ACTION');
  const player = granRondaPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  const game = granRondaMiniGameById(state.miniGame.questionId);
  const playerState = state.miniGame.playerStates[playerId];
  if (
    !game.options.some((option) => option.id === optionId) ||
    !playerState ||
    playerState.finished
  ) {
    return err('INVALID_ACTION');
  }

  const next = bump(state);
  const nextPlayerState = next.miniGame.playerStates[playerId];
  if (!nextPlayerState) return err('INVALID_ACTION');
  next.miniGame.submissions[playerId] = optionId;
  nextPlayerState.actions += 1;

  if (game.id === 'sieteymedia') {
    if (optionId === 'stand') {
      nextPlayerState.finished = true;
      nextPlayerState.completedAt = now;
    } else {
      const card = nextSevenHalfCard(next);
      nextPlayerState.lastCard = card;
      nextPlayerState.score = Math.round((nextPlayerState.score + card) * 2) / 2;
      if (nextPlayerState.score >= 7.5 || nextPlayerState.score > 7.5) {
        nextPlayerState.finished = true;
        nextPlayerState.busted = nextPlayerState.score > 7.5;
        nextPlayerState.completedAt = now;
      }
    }
  } else if (game.id === 'musical') {
    if (optionId !== 'pulse') return err('INVALID_ACTION');
    nextPlayerState.score = Math.min(3, nextPlayerState.score + 1);
    if (nextPlayerState.score >= 3) {
      nextPlayerState.finished = true;
      nextPlayerState.completedAt = now;
    }
  } else {
    nextPlayerState.score = optionId === next.miniGame.targetOptionId ? 3 : 1;
    nextPlayerState.finished = true;
    nextPlayerState.completedAt = now;
  }

  if (allMiniPlayersFinished(next)) revealMiniGame(next);
  return ok({ state: next, events: [] });
}

function submitEmbeddedGameAction(
  state: GranRondaState,
  playerId: PlayerId,
  action: GranRondaEmbeddedGameAction,
  now: number,
): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'minigameInput') return err('INVALID_ACTION');
  const player = granRondaPlayer(state, playerId);
  if (!player) return err('PLAYER_NOT_IN_ROOM');
  if (player.left) return err('PLAYER_ELIMINATED');
  if (!state.miniGame.embeddedGame) return err('INVALID_ACTION');

  const next = bump(state);
  const embedded = next.miniGame.embeddedGame;
  if (!embedded) return err('INVALID_ACTION');
  const result =
    embedded.gameId === 'musical'
      ? applyMusicalAction(embedded, playerId, action, now)
      : isPartyEmbeddedGame(embedded)
        ? applyPartyAction(embedded, playerId, action, now)
        : isRoadmapEmbeddedGame(embedded)
          ? applyRoadmapAction(embedded, playerId, action, now)
          : embedded.gameId === 'preciojusto'
            ? applyPrecioJustoAction(embedded, playerId, action, now)
            : embedded.gameId === 'laronda'
              ? applyRondaAction(embedded, playerId, action, now)
              : embedded.gameId === 'chinchon'
                ? applyChinchonAction(embedded, playerId, action, now)
                : embedded.gameId === 'pocha'
                  ? applyPochaAction(embedded, playerId, action, now)
                  : applyClassicAction(embedded, playerId, action, now);
  if (!result.ok) return err(result.code);

  next.miniGame.embeddedGame = result.value.state;
  if (embeddedGameIsFinished(result.value.state)) {
    syncMiniPlayerStatesFromEmbedded(next);
    revealMiniGame(next);
  }
  return ok({ state: next, events: result.value.events });
}

function finishMiniGame(state: GranRondaState, playerId: PlayerId): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'minigameInput') return err('INVALID_ACTION');
  if (!isHost(state, playerId)) return err('NOT_HOST');
  // Los juegos alojados gobiernan su propio final. Esto evita que el anfitrión
  // cierre por accidente una prueba rápida tras la primera de sus tres rondas.
  if (state.miniGame.embeddedGame) return err('INVALID_ACTION');
  const next = bump(state);
  revealMiniGame(next);
  return ok({ state: next, events: [] });
}

function nextRound(state: GranRondaState, playerId: PlayerId): GranRondaActionResult {
  if (state.status !== 'playing' || state.phase !== 'minigameReveal') {
    return err('INVALID_ACTION');
  }
  if (state.duel) return err('INVALID_ACTION');
  if (!isHost(state, playerId)) return err('NOT_HOST');
  if (state.round >= state.config.rounds) return err('INVALID_ACTION');

  const next = bump(state);
  next.round += 1;
  next.phase = 'movement';
  next.movedPlayerIds = [];
  const preferredFirstSeat = firstSeatForRound(next);
  next.turnSeat = null;
  next.movement = null;
  next.resolution = null;
  next.lastInteraction = null;
  refreshTrapSpaces(next);
  next.stampCost = nextRandomInt(next, GRAN_RONDA_STAMP_MIN_COST, GRAN_RONDA_STAMP_MAX_COST);
  next.stampValue = stampValueForRound(next);
  next.miniGame.questionIndex =
    (next.miniGame.questionIndex + 1) % next.miniGame.questionOrder.length;
  next.miniGame.questionId =
    next.miniGame.questionOrder[next.miniGame.questionIndex] ?? next.miniGame.questionId;
  next.miniGame.submissions = {};
  next.miniGame.playerStates = {};
  next.miniGame.targetOptionId = null;
  next.miniGame.scoreDeltas = null;
  next.miniGame.results = null;
  prepareMiniGame(next);
  const activeBySeat = activeGranRondaPlayers(next).sort((left, right) => left.seat - right.seat);
  const preferredIndex = activeBySeat.findIndex((player) => player.seat === preferredFirstSeat);
  const previousSeat =
    preferredIndex >= 0
      ? (activeBySeat[(preferredIndex - 1 + activeBySeat.length) % activeBySeat.length]?.seat ??
        null)
      : null;
  const firstPlayer = nextMovementPlayer(next, previousSeat);
  if (firstPlayer) {
    next.turnSeat = firstPlayer.seat;
  } else {
    next.phase = 'minigameInput';
  }
  next.rematchVotes = [];
  return ok({ state: next, events: [] });
}

function resolveLanding(state: GranRondaState, player: GranRondaPlayer): void {
  const space = granRondaSpaceById(player.position);
  if (!space) return;
  player.lastSpaceId = space.id;

  if (state.trapSpaceIds.includes(space.id)) {
    const lostCoins = Math.min(3, player.coins);
    const coinsDelta = lostCoins === 0 ? 0 : -lostCoins;
    player.coins -= lostCoins;
    const nextTrapSpaceId = relocateTriggeredTrap(state, space.id);
    const nextTrapLabel = nextTrapSpaceId
      ? (granRondaSpaceById(nextTrapSpaceId)?.label ?? 'otra casilla')
      : 'otra casilla';
    state.resolution = {
      kind: 'trampa',
      spaceId: space.id,
      title: '¡Emboscada del monstruo!',
      message:
        lostCoins > 0
          ? `El monstruo te golpea y te roba ${lostCoins} Oros. Después huye y coloca su trampa en ${nextTrapLabel}.`
          : `El monstruo intenta robarte, pero no llevas Oros. Después huye y coloca su trampa en ${nextTrapLabel}.`,
      coinsDelta,
      sealsDelta: 0,
      purchasedPowerups: [],
    };
    return;
  }

  let coinsDelta = 0;
  let title = space.label;
  let message = 'La ficha ha llegado a esta casilla.';

  if (space.type === 'oros') {
    coinsDelta = 3;
    player.coins += coinsDelta;
    title = 'Has encontrado Oros';
    message = 'La casilla te entrega 3 Oros.';
  }
  if (space.type === 'perdida') {
    player.skipTurns = Math.max(player.skipTurns, 1);
    title = 'A la cárcel';
    message = 'Pierdes tu próximo turno de movimiento, pero sí jugarás el minijuego con todos.';
  }
  if (space.type === 'evento') {
    coinsDelta = 1;
    player.coins += coinsDelta;
    title = 'Cruce de la Ronda';
    message =
      'El cruce de suerte te concede 1 Oro. Elige bien tu ruta para acercarte a una tienda o al Sello.';
  }
  if (space.type === 'atajo') {
    const bridgeDestinationId = granRondaBridgeDestination(space.id);
    const bridgeDestination = bridgeDestinationId
      ? granRondaSpaceById(bridgeDestinationId)
      : undefined;
    if (bridgeDestination) {
      player.position = bridgeDestination.id;
      title = 'De puente a puente';
      message = `El puente te lleva directamente hasta ${bridgeDestination.label}.`;
    } else {
      coinsDelta = 2;
      player.coins += coinsDelta;
      title = 'Atajo';
      message = 'El atajo premia la decisión con 2 Oros.';
    }
  }

  if (space.type === 'doble') {
    player.powerups.doubleRoll += 1;
    title = 'Dado doble';
    message = 'La casilla te entrega una ficha para tirar dos dados en un turno futuro.';
  }

  if (space.type === 'penalizacion') {
    player.powerups.rivalPenalty += 1;
    title = 'Penalización';
    message = 'Has encontrado una penalización para quitar 2 Oros a un rival en su próximo turno.';
  }

  if (space.type === 'tienda') {
    const remainingSteps = state.movement?.remainingSteps ?? 0;
    title = remainingSteps > 0 ? 'Parada en la tienda' : 'Tienda de la Ronda';
    message =
      remainingSteps > 0
        ? `Puedes gastar Oros antes de continuar ${remainingSteps === 1 ? 'la casilla que te queda' : `las ${remainingSteps} casillas que te quedan`}.`
        : 'Puedes gastar Oros en un dado doble o en una penalización para un rival.';
  }

  if (space.type === 'sello') {
    if (space.id === state.stampSpaceId) {
      title = 'Sello disponible';
      message =
        player.coins >= state.stampCost
          ? `${state.stampValue === 1 ? 'Este Sello' : `Este lote de ${state.stampValue} Sellos`} cuesta ${state.stampCost} Oros. Puedes comprarlo ahora o guardar tus Oros.`
          : `Necesitas ${state.stampCost} Oros para comprarlo; ahora tienes ${player.coins}.`;
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
    sealsDelta: 0,
    purchasedPowerups: [],
  };
}

function stampValueForRound(state: GranRondaState): number {
  const doubleStampRound = Math.max(3, Math.ceil(state.config.rounds * 0.67));
  return state.round >= doubleStampRound ? 2 : 1;
}

function finishMovement(state: GranRondaState, playerId: PlayerId): void {
  if (!state.movedPlayerIds.includes(playerId)) state.movedPlayerIds.push(playerId);
  const nextPlayer = nextMovementPlayer(state, state.turnSeat);
  if (!nextPlayer) {
    prepareMiniGame(state);
    state.phase = 'minigameInput';
    state.turnSeat = null;
    return;
  }

  state.turnSeat = nextPlayer.seat;
  state.phase = 'movement';
}

/**
 * Encuentra la siguiente ficha que puede tirar y consume de forma explícita
 * los turnos de cárcel. Una persona encarcelada sigue entrando en el minijuego.
 */
function nextMovementPlayer(
  state: GranRondaState,
  afterSeat: number | null,
): GranRondaPlayer | null {
  const active = activeGranRondaPlayers(state).sort((left, right) => left.seat - right.seat);
  const afterIndex =
    afterSeat === null ? -1 : active.findIndex((player) => player.seat === afterSeat);
  const ordered =
    afterIndex < 0 ? active : [...active.slice(afterIndex + 1), ...active.slice(0, afterIndex + 1)];
  for (const player of ordered) {
    if (state.movedPlayerIds.includes(player.playerId)) continue;
    if (player.skipTurns > 0) {
      player.skipTurns -= 1;
      state.movedPlayerIds.push(player.playerId);
      continue;
    }
    return player;
  }
  return null;
}

function revealMiniGame(state: GranRondaState): void {
  syncMiniPlayerStatesFromEmbedded(state);
  if (state.duel) {
    revealDuel(state);
    return;
  }
  const active = activeGranRondaPlayers(state);
  const ranked = [...active].sort((left, right) => {
    const leftState = state.miniGame.playerStates[left.playerId];
    const rightState = state.miniGame.playerStates[right.playerId];
    const leftBusted = leftState?.busted ? 1 : 0;
    const rightBusted = rightState?.busted ? 1 : 0;
    return (
      leftBusted - rightBusted ||
      (rightState?.score ?? 0) - (leftState?.score ?? 0) ||
      (leftState?.completedAt ?? Number.POSITIVE_INFINITY) -
        (rightState?.completedAt ?? Number.POSITIVE_INFINITY) ||
      left.seat - right.seat
    );
  });
  const scoreDeltas: Record<PlayerId, number> = {};
  const results: Record<PlayerId, GranRondaMiniGameResult> = {};
  ranked.forEach((player, index) => {
    const playerState = state.miniGame.playerStates[player.playerId];
    const rank = index + 1;
    const busted = playerState?.busted ?? false;
    const completed = playerState?.finished ?? false;
    const reward = miniGameReward(
      state.miniGame.questionId,
      rank,
      ranked.length,
      completed,
      busted,
    );
    scoreDeltas[player.playerId] = reward;
    player.coins += reward;
    results[player.playerId] = {
      rank,
      score: playerState?.score ?? 0,
      reward,
      outcome: busted ? 'bust' : rank === 1 ? 'winner' : rank === 2 ? 'podium' : 'participant',
    };
  });
  state.miniGame.scoreDeltas = scoreDeltas;
  state.miniGame.results = results;
  state.phase = 'minigameReveal';
  if (state.round >= state.config.rounds) {
    state.status = 'gameEnd';
    state.winnerId = decideWinner(state);
  }
}

function revealDuel(state: GranRondaState): void {
  const duel = state.duel;
  if (!duel) return;
  const actor = granRondaPlayer(state, duel.actorPlayerId);
  const target = granRondaPlayer(state, duel.targetPlayerId);
  if (!actor || !target) return;
  const actorState = state.miniGame.playerStates[actor.playerId];
  const targetState = state.miniGame.playerStates[target.playerId];
  const actorScore = actorState?.busted ? Number.NEGATIVE_INFINITY : (actorState?.score ?? 0);
  const targetScore = targetState?.busted ? Number.NEGATIVE_INFINITY : (targetState?.score ?? 0);
  const winner = actorScore === targetScore ? null : actorScore > targetScore ? actor : target;
  const loser = winner?.playerId === actor.playerId ? target : winner ? actor : null;
  const transferred = winner && loser ? duel.wager : 0;
  if (winner && loser) {
    loser.coins -= transferred;
    winner.coins += transferred;
  }

  state.lastInteraction = {
    kind: 'duel',
    actorPlayerId: actor.playerId,
    targetPlayerId: target.playerId,
    coinsTransferred: transferred,
    wager: duel.wager,
    actorRoll: null,
    targetRoll: null,
    winnerId: winner?.playerId ?? null,
    gameId: duel.gameId,
  };
  state.miniGame.scoreDeltas = {
    [actor.playerId]:
      winner?.playerId === actor.playerId ? transferred : loser === actor ? -transferred : 0,
    [target.playerId]:
      winner?.playerId === target.playerId ? transferred : loser === target ? -transferred : 0,
  };
  state.miniGame.results = {
    [actor.playerId]: {
      rank: winner === null ? 1 : winner.playerId === actor.playerId ? 1 : 2,
      score: actorState?.score ?? 0,
      reward: state.miniGame.scoreDeltas[actor.playerId] ?? 0,
      outcome: winner?.playerId === actor.playerId ? 'winner' : 'participant',
    },
    [target.playerId]: {
      rank: winner === null ? 1 : winner.playerId === target.playerId ? 1 : 2,
      score: targetState?.score ?? 0,
      reward: state.miniGame.scoreDeltas[target.playerId] ?? 0,
      outcome: winner?.playerId === target.playerId ? 'winner' : 'participant',
    },
  };
  state.phase = 'minigameReveal';
}

function miniGameReward(
  gameId: GranRondaMiniGameId,
  rank: number,
  playerCount: number,
  completed: boolean,
  busted: boolean,
): number {
  if (!completed || busted) return 0;
  if (gameId === 'cinquillo') {
    if (playerCount <= 1) return 6;
    if (rank >= playerCount) return 0;
    return Math.max(1, Math.round((6 * (playerCount - rank)) / (playerCount - 1)));
  }
  return rank === 1 ? 6 : rank === 2 ? 3 : 1;
}

function allMiniPlayersFinished(state: GranRondaState): boolean {
  const active = activeGranRondaPlayers(state);
  return (
    active.length > 0 &&
    active.every((player) => state.miniGame.playerStates[player.playerId]?.finished)
  );
}

function prepareMiniGame(state: GranRondaState, participantIds?: PlayerId[]): void {
  const game = granRondaMiniGameById(state.miniGame.questionId);
  const participants = participantIds
    ? participantIds
        .map((playerId) => granRondaPlayer(state, playerId))
        .filter((player): player is GranRondaPlayer => Boolean(player && !player.left))
    : activeGranRondaPlayers(state);
  state.miniGame.submissions = {};
  state.miniGame.scoreDeltas = null;
  state.miniGame.results = null;
  state.miniGame.embeddedGame = createEmbeddedGame(
    state,
    participants.map((player) => player.playerId),
    participantIds !== undefined,
  );
  state.miniGame.targetOptionId =
    game.id === 'cinquillo'
      ? (game.options[nextRandomInt(state, 0, game.options.length - 1)]?.id ?? null)
      : null;
  state.miniGame.playerStates = Object.fromEntries(
    participants.map((player) => [
      player.playerId,
      {
        score: game.id === 'sieteymedia' ? nextRandomInt(state, 1, 6) : 0,
        lastCard: null,
        finished: false,
        busted: false,
        actions: 0,
        completedAt: null,
      },
    ]),
  ) as Record<PlayerId, GranRondaMiniPlayerState>;
}

function createEmbeddedGame(
  state: GranRondaState,
  participantIds = activeGranRondaPlayers(state).map((player) => player.playerId),
  normalizeSeats = false,
): GranRondaEmbeddedGameState {
  const participants = participantIds
    .map((playerId) => granRondaPlayer(state, playerId))
    .filter((player): player is GranRondaPlayer => Boolean(player && !player.left));
  const players = participants.map((player, index) => ({
    playerId: player.playerId,
    nick: player.nick,
    seat: normalizeSeats ? index : player.seat,
    isBot: player.isBot,
  }));
  const playerInputs = players.map(({ playerId, nick, seat }) => ({ playerId, nick, seat }));
  const partyPlayers = playerInputs;
  const seed = `${state.rng.seed}:granronda:${state.round}:${state.miniGame.questionId}${state.duel ? `:duel:${state.duel.actorPlayerId}:${state.duel.targetPlayerId}:${state.rng.calls}` : ''}`;
  const id = state.miniGame.questionId;

  if (id === 'chinchon') {
    return createChinchonState({
      config: DEFAULT_CONFIG,
      players: playerInputs,
      seed,
      roomCode: state.roomCode,
    });
  }

  const classicConfigs = {
    brisca: DEFAULT_BRISCA_CONFIG,
    escoba: DEFAULT_ESCOBA_CONFIG,
    sieteymedia: DEFAULT_SIETE_Y_MEDIA_CONFIG,
    tute: DEFAULT_TUTE_CONFIG,
    cinquillo: DEFAULT_CINQUILLO_CONFIG,
  } as const;
  if (id in classicConfigs) {
    const classicId = id as keyof typeof classicConfigs;
    return createClassicState(
      { config: classicConfigs[classicId], players: playerInputs, seed, roomCode: state.roomCode },
      classicId,
    );
  }

  if (id === 'pocha') {
    return createPochaState({
      config: DEFAULT_POCHA_CONFIG,
      players: playerInputs,
      seed,
      roomCode: state.roomCode,
    });
  }

  if (id === 'laronda') {
    return createRondaState({
      config: DEFAULT_LA_RONDA_CONFIG,
      players: playerInputs,
      seed,
      roomCode: state.roomCode,
    });
  }

  const partyConfigs = {
    orden: DEFAULT_ORDEN_CONFIG,
    colores: { ...DEFAULT_COLORES_CONFIG, rounds: 3 as const, pointsToWin: 40 as const },
    mayoria: { ...DEFAULT_MAYORIA_CONFIG, rounds: 3 as const, pointsToWin: 40 as const },
    escala: {
      ...DEFAULT_ESCALA_CONFIG,
      rounds: 3 as const,
      pointsToWin: 40 as const,
      modo: 'online' as const,
      answerTimeSeconds: 10 as const,
    },
    matiz: { ...DEFAULT_MATIZ_CONFIG, rounds: 3 as const },
  } as const;
  if (id in partyConfigs) {
    const partyId = id as keyof typeof partyConfigs;
    return createPartyState(
      { config: partyConfigs[partyId], players: partyPlayers, seed, roomCode: state.roomCode },
      partyId,
    );
  }

  if (id === 'preciojusto') {
    return createPrecioJustoState({
      config: { ...DEFAULT_PRECIO_JUSTO_CONFIG, rounds: 3, answerTimeSeconds: 0 },
      players,
      seed,
      roomCode: state.roomCode,
    });
  }

  const roadmapConfigs = {
    banderas: { ...DEFAULT_BANDERAS_CONFIG, rounds: 3, answerTimeSeconds: 0 },
    cifras: { ...DEFAULT_CIFRAS_CONFIG, rounds: 3, answerTimeSeconds: 0 },
    quienloharia: {
      ...DEFAULT_QUIEN_LO_HARIA_CONFIG,
      rounds: 3,
      answerTimeSeconds: 0,
      competitive: true,
    },
    completalafrase: { ...DEFAULT_COMPLETA_LA_FRASE_CONFIG, rounds: 3, answerTimeSeconds: 0 },
  } as const;
  if (id in roadmapConfigs) {
    const roadmapId = id as keyof typeof roadmapConfigs;
    const roadmapInput = {
      config: roadmapConfigs[roadmapId],
      players,
      seed,
      roomCode: state.roomCode,
    };
    if (roadmapId === 'banderas') return createBanderasState(roadmapInput);
    if (roadmapId === 'cifras') return createCifrasState(roadmapInput);
    if (roadmapId === 'quienloharia') return createQuienLoHariaState(roadmapInput);
    return createCompletaLaFraseState(roadmapInput);
  }

  return createMusicalState({
    config: { ...DEFAULT_MUSICAL_CONFIG, rounds: 3, audioMode: 'online' },
    players,
    seed,
    roomCode: state.roomCode,
  });
}

function embeddedGameIsFinished(game: GranRondaEmbeddedGameState): boolean {
  if (game.gameId === 'musical') return game.status === 'gameEnd';
  if (isPartyEmbeddedGame(game)) {
    if (game.gameId === 'orden') return game.status === 'gameEnd';
    const revealReady =
      game.phase === 'reveal' && (game.gameId !== 'mayoria' || game.majority?.groups !== null);
    return game.status === 'gameEnd' || (revealReady && game.round >= 3);
  }
  if (isRoadmapEmbeddedGame(game)) {
    return game.status === 'gameEnd' || (game.phase === 'reveal' && game.round >= 3);
  }
  if (game.gameId === 'preciojusto') {
    return game.status === 'gameEnd' || (game.phase === 'reveal' && game.round >= 3);
  }
  if (game.gameId === 'laronda') return game.status === 'roundEnd' || game.status === 'gameEnd';
  if (game.gameId === 'chinchon') return game.status === 'roundEnd' || game.status === 'gameEnd';
  if (game.gameId === 'pocha') return game.status === 'roundEnd' || game.status === 'gameEnd';
  return game.status !== 'playing';
}

function isPartyEmbeddedGame(game: GranRondaEmbeddedGameState): game is PartyState {
  return (
    game.gameId === 'orden' ||
    game.gameId === 'colores' ||
    game.gameId === 'mayoria' ||
    game.gameId === 'escala' ||
    game.gameId === 'matiz'
  );
}

function isRoadmapEmbeddedGame(game: GranRondaEmbeddedGameState): game is RoadmapState {
  return (
    game.gameId === 'banderas' ||
    game.gameId === 'cifras' ||
    game.gameId === 'quienloharia' ||
    game.gameId === 'completalafrase'
  );
}

function syncMiniPlayerStatesFromEmbedded(state: GranRondaState): void {
  const embedded = state.miniGame.embeddedGame;
  if (!embedded) return;

  if (embedded.gameId === 'musical') {
    for (const player of activeGranRondaPlayers(state)) {
      const embeddedPlayer = embedded.players.find(
        (candidate) => candidate.playerId === player.playerId,
      );
      if (!embeddedPlayer) continue;
      const guesses = embedded.guesses[player.playerId] ?? [];
      const completed = embedded.status === 'gameEnd' || guesses.length > 0;
      state.miniGame.playerStates[player.playerId] = {
        score: embeddedPlayer.score,
        lastCard: null,
        finished: completed,
        busted: false,
        actions: guesses.length,
        completedAt: completed ? player.seat : null,
      };
    }
    return;
  }

  if (isPartyEmbeddedGame(embedded)) {
    for (const player of activeGranRondaPlayers(state)) {
      const embeddedPlayer = embedded.players.find(
        (candidate) => candidate.playerId === player.playerId,
      );
      if (!embeddedPlayer) continue;
      const submitted =
        embedded.gameId === 'orden'
          ? (embedded.order?.played.some((played) => played.playerId === player.playerId) ?? false)
          : embedded.gameId === 'colores'
            ? embedded.colors?.submissions[player.playerId] !== undefined
            : embedded.gameId === 'mayoria'
              ? embedded.majority?.submissions[player.playerId] !== undefined
              : embedded.gameId === 'escala'
                ? embedded.scale?.guesses[player.playerId] !== undefined ||
                  embedded.scale?.cluePlayerId === player.playerId
                : embedded.matiz?.submissions[player.playerId] !== undefined;
      state.miniGame.playerStates[player.playerId] = {
        score: embeddedPlayer.score,
        lastCard: null,
        finished: embedded.phase === 'reveal' || submitted,
        busted: false,
        actions: submitted ? 1 : 0,
        completedAt: embedded.phase === 'reveal' ? player.seat : null,
      };
    }
    return;
  }

  if (isRoadmapEmbeddedGame(embedded)) {
    for (const player of activeGranRondaPlayers(state)) {
      const embeddedPlayer = embedded.players.find(
        (candidate) => candidate.playerId === player.playerId,
      );
      if (!embeddedPlayer) continue;
      const submitted =
        embedded.gameId === 'banderas'
          ? embedded.flags.submissions[player.playerId] !== undefined
          : embedded.gameId === 'cifras'
            ? embedded.cifras.submissions[player.playerId] !== undefined ||
              embedded.cifras.orderSubmissions[player.playerId] !== undefined ||
              embedded.cifras.choiceSubmissions[player.playerId] !== undefined
            : embedded.gameId === 'quienloharia'
              ? embedded.who.submissions[player.playerId] !== undefined
              : embedded.sentence.submissions[player.playerId] !== undefined;
      const completed = embedded.phase === 'reveal' || submitted;
      state.miniGame.playerStates[player.playerId] = {
        score: embeddedPlayer.score,
        lastCard: null,
        finished: completed,
        busted: false,
        actions: submitted ? 1 : 0,
        completedAt: completed ? player.seat : null,
      };
    }
    return;
  }

  if (embedded.gameId === 'preciojusto') {
    for (const player of activeGranRondaPlayers(state)) {
      const embeddedPlayer = embedded.players.find(
        (candidate) => candidate.playerId === player.playerId,
      );
      if (!embeddedPlayer) continue;
      const submitted = embedded.price.submissions[player.playerId] !== undefined;
      const completed = embedded.phase === 'reveal' || submitted;
      state.miniGame.playerStates[player.playerId] = {
        score: embeddedPlayer.score,
        lastCard: null,
        finished: completed,
        busted: false,
        actions: submitted ? 1 : 0,
        completedAt: completed ? player.seat : null,
      };
    }
    return;
  }

  if (embedded.gameId === 'laronda') {
    for (const player of activeGranRondaPlayers(state)) {
      const embeddedPlayer = embedded.players.find(
        (candidate) => candidate.playerId === player.playerId,
      );
      if (!embeddedPlayer) continue;
      const completed = embedded.status !== 'playing';
      state.miniGame.playerStates[player.playerId] = {
        score: embeddedPlayer.score,
        lastCard: null,
        finished: completed,
        busted: false,
        actions: embeddedPlayer.hand.length,
        completedAt: completed ? player.seat : null,
      };
    }
    return;
  }

  if (embedded.gameId === 'chinchon' || embedded.gameId === 'pocha') {
    for (const player of activeGranRondaPlayers(state)) {
      const embeddedPlayer = embedded.players.find(
        (candidate) => candidate.playerId === player.playerId,
      );
      if (!embeddedPlayer) continue;
      const completed = embedded.status !== 'playing';
      state.miniGame.playerStates[player.playerId] = {
        score: embeddedPlayer.score,
        lastCard: null,
        finished: completed,
        busted: false,
        actions: embeddedPlayer.hand.length,
        completedAt: completed ? player.seat : null,
      };
    }
    return;
  }

  for (const player of activeGranRondaPlayers(state)) {
    const embeddedPlayer = embedded.players.find(
      (candidate) => candidate.playerId === player.playerId,
    );
    if (!embeddedPlayer) continue;
    const completed =
      embedded.status !== 'playing' ||
      embeddedPlayer.stood ||
      embeddedPlayer.bust ||
      embeddedPlayer.revealed;
    state.miniGame.playerStates[player.playerId] = {
      score: embeddedPlayer.score,
      lastCard: null,
      finished: completed,
      busted: embeddedPlayer.bust,
      actions: embeddedPlayer.hand.length,
      completedAt: completed ? player.seat : null,
    };
  }
}

function nextSevenHalfCard(state: GranRondaState): number {
  const rank = nextRandomInt(state, 1, 10);
  return rank <= 7 ? rank : 0.5;
}

function decideWinner(state: GranRondaState): PlayerId | null {
  return (
    [...activeGranRondaPlayers(state)].sort(
      (left, right) =>
        right.seals - left.seals || right.coins - left.coins || left.seat - right.seat,
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

function nextRandomStampTarget(state: GranRondaState, currentId: string): string {
  const candidates = GRAN_RONDA_STAMP_TARGETS.filter((target) => target !== currentId);
  if (candidates.length === 0) return currentId;
  return candidates[nextRandomInt(state, 0, candidates.length - 1)] ?? candidates[0] ?? currentId;
}

function trapCountForPlayerCount(playerCount: number): number {
  return playerCount >= 5 ? 2 : 1;
}

function refreshTrapSpaces(state: GranRondaState): void {
  const previous = new Set(state.trapSpaceIds);
  let candidates = GRAN_RONDA_TRAP_TARGETS.filter(
    (spaceId) => spaceId !== state.stampSpaceId && !previous.has(spaceId),
  );
  const selected: string[] = [];
  const desired = Math.min(
    trapCountForPlayerCount(activeGranRondaPlayers(state).length),
    GRAN_RONDA_TRAP_TARGETS.length,
  );
  if (candidates.length < desired) {
    candidates = [
      ...candidates,
      ...GRAN_RONDA_TRAP_TARGETS.filter(
        (spaceId) => spaceId !== state.stampSpaceId && !candidates.includes(spaceId),
      ),
    ];
  }
  while (selected.length < desired && candidates.length > 0) {
    const index = nextRandomInt(state, 0, candidates.length - 1);
    const [spaceId] = candidates.splice(index, 1);
    if (spaceId) selected.push(spaceId);
  }
  state.trapSpaceIds = selected;
}

function relocateTriggeredTrap(state: GranRondaState, triggeredSpaceId: string): string | null {
  const retained = state.trapSpaceIds.filter((spaceId) => spaceId !== triggeredSpaceId);
  const occupied = new Set(activeGranRondaPlayers(state).map((player) => player.position));
  let candidates = GRAN_RONDA_TRAP_TARGETS.filter(
    (spaceId) =>
      spaceId !== triggeredSpaceId &&
      spaceId !== state.stampSpaceId &&
      !retained.includes(spaceId) &&
      !occupied.has(spaceId),
  );
  if (candidates.length === 0) {
    candidates = GRAN_RONDA_TRAP_TARGETS.filter(
      (spaceId) =>
        spaceId !== triggeredSpaceId &&
        spaceId !== state.stampSpaceId &&
        !retained.includes(spaceId),
    );
  }
  const nextSpaceId =
    candidates.length > 0
      ? (candidates[nextRandomInt(state, 0, candidates.length - 1)] ?? null)
      : null;
  state.trapSpaceIds = nextSpaceId ? [...retained, nextSpaceId] : retained;
  return nextSpaceId;
}

function bump(state: GranRondaState): GranRondaState {
  const movement: GranRondaMovementState | null = state.movement
    ? {
        ...state.movement,
        dice: [...state.movement.dice],
        path: [...state.movement.path],
        routeOptions: [...state.movement.routeOptions],
        routePaths: Object.fromEntries(
          Object.entries(state.movement.routePaths).map(([destinationId, path]) => [
            destinationId,
            [...path],
          ]),
        ),
        plannedPath: [...state.movement.plannedPath],
      }
    : null;
  const resolution: GranRondaResolutionState | null = state.resolution
    ? {
        ...state.resolution,
        purchasedPowerups: state.resolution.purchasedPowerups
          ? [...state.resolution.purchasedPowerups]
          : undefined,
      }
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
    trapSpaceIds: [...state.trapSpaceIds],
    movedPlayerIds: [...state.movedPlayerIds],
    movement,
    resolution,
    lastInteraction: state.lastInteraction ? { ...state.lastInteraction } : null,
    duel: state.duel ? { ...state.duel } : null,
    miniGame: {
      ...state.miniGame,
      questionOrder: [...state.miniGame.questionOrder],
      submissions: { ...state.miniGame.submissions },
      playerStates: Object.fromEntries(
        Object.entries(state.miniGame.playerStates).map(([playerId, playerState]) => [
          playerId,
          { ...playerState },
        ]),
      ),
      scoreDeltas: state.miniGame.scoreDeltas ? { ...state.miniGame.scoreDeltas } : null,
      results: state.miniGame.results
        ? Object.fromEntries(
            Object.entries(state.miniGame.results).map(([playerId, result]) => [
              playerId,
              { ...result },
            ]),
          )
        : null,
      embeddedGame: state.miniGame.embeddedGame
        ? cloneEmbeddedGame(state.miniGame.embeddedGame)
        : null,
    },
    rematchVotes: [...state.rematchVotes],
    version: state.version + 1,
  };
}

function cloneEmbeddedGame(game: GranRondaEmbeddedGameState): GranRondaEmbeddedGameState {
  if (game.gameId === 'musical') {
    return {
      ...game,
      players: game.players.map((player) => ({ ...player, hand: [...player.hand] })),
      playedTrackIds: [...game.playedTrackIds],
      currentTrack: game.currentTrack ? { ...game.currentTrack } : null,
      blockedPlayerIds: [...game.blockedPlayerIds],
      gaveUpPlayerIds: [...(game.gaveUpPlayerIds ?? [])],
      guesses: Object.fromEntries(
        Object.entries(game.guesses).map(([playerId, guesses]) => [
          playerId,
          guesses.map((guess) => ({ ...guess })),
        ]),
      ),
      roundResult: game.roundResult
        ? {
            ...game.roundResult,
            track: { ...game.roundResult.track },
            guesses: Object.fromEntries(
              Object.entries(game.roundResult.guesses).map(([playerId, guesses]) => [
                playerId,
                guesses.map((guess) => ({ ...guess })),
              ]),
            ),
            responseTimes: { ...game.roundResult.responseTimes },
          }
        : null,
      rematchVotes: [...game.rematchVotes],
    };
  }
  if (
    isPartyEmbeddedGame(game) ||
    isRoadmapEmbeddedGame(game) ||
    game.gameId === 'preciojusto' ||
    game.gameId === 'laronda' ||
    game.gameId === 'chinchon' ||
    game.gameId === 'pocha'
  ) {
    return JSON.parse(JSON.stringify(game)) as GranRondaEmbeddedGameState;
  }
  return {
    ...game,
    rng: { ...game.rng },
    deck: [...game.deck],
    currentTrick: game.currentTrick.map((card) => ({ ...card })),
    tableCards: [...game.tableCards],
    players: game.players.map((player) => ({
      ...player,
      hand: [...player.hand],
      captured: [...player.captured],
      sungSuits: [...player.sungSuits],
    })),
    rematchVotes: [...game.rematchVotes],
  };
}
