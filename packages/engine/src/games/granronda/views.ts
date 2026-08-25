import type {
  GranRondaBoardPlayer,
  GranRondaCommonView,
  GranRondaMiniGamePublic,
  GranRondaMovementPublic,
  GranRondaPlayerView,
  GranRondaPlayerViewMe,
  GranRondaPowerupType,
  GranRondaResolutionPublic,
  GranRondaTableView,
  GranRondaAvailableAction,
  PlayerId,
  PublicPlayer,
} from '@ronda/protocol';
import { granRondaMiniGameById } from './content.ts';
import {
  getPlayerView as getChinchonPlayerView,
  getTableView as getChinchonTableView,
} from '../chinchon/views.ts';
import { getClassicPlayerView, getClassicTableView } from '../classics/views.ts';
import {
  getPlayerView as getMusicalPlayerView,
  getTableView as getMusicalTableView,
} from '../musical/views.ts';
import {
  getPlayerView as getPartyPlayerView,
  getTableView as getPartyTableView,
} from '../party/views.ts';
import {
  getPlayerView as getPochaPlayerView,
  getTableView as getPochaTableView,
} from '../pocha/views.ts';
import {
  getPlayerView as getPrecioJustoPlayerView,
  getTableView as getPrecioJustoTableView,
} from '../preciojusto/views.ts';
import {
  getPlayerView as getRoadmapPlayerView,
  getTableView as getRoadmapTableView,
} from '../roadmap/views.ts';
import { getRondaPlayerView, getRondaTableView } from '../laronda/views.ts';
import { GRAN_RONDA_POWERUP_COSTS } from './rules.ts';
import { activeGranRondaPlayers, granRondaPlayer, type GranRondaState } from './state.ts';
import type { PartyState } from '../party/state.ts';
import type { RoadmapState } from '../roadmap/state.ts';

function publicPlayers(state: GranRondaState): PublicPlayer[] {
  return state.players.map((player) => ({
    playerId: player.playerId,
    nick: player.nick,
    seat: player.seat,
    isBot: player.isBot,
    tokenIcon: player.tokenIcon,
    colorIndex: (player.seat % 8) as PublicPlayer['colorIndex'],
    score: player.seals,
    handCount: 0,
    connected: true,
    isHost: player.seat === 0,
    eliminated: player.left,
    teamIndex: null,
  }));
}

function boardPlayers(state: GranRondaState): GranRondaBoardPlayer[] {
  return state.players.map((player) => ({
    playerId: player.playerId,
    position: player.position,
    coins: player.coins,
    seals: player.seals,
    skipTurns: player.skipTurns,
    powerups: { ...player.powerups },
    lastRoll: player.lastRoll,
    lastSpaceId: player.lastSpaceId,
  }));
}

function movement(state: GranRondaState): GranRondaMovementPublic | null {
  return state.movement
    ? {
        playerId: state.movement.playerId,
        roll: state.movement.roll,
        dice: [...state.movement.dice],
        path: [...state.movement.path],
        remainingSteps: state.movement.remainingSteps,
        routeOptions: [...state.movement.routeOptions],
        routePaths: Object.fromEntries(
          Object.entries(state.movement.routePaths).map(([destinationId, path]) => [
            destinationId,
            [...path],
          ]),
        ),
      }
    : null;
}

function resolution(state: GranRondaState): GranRondaResolutionPublic | null {
  return state.resolution
    ? {
        ...state.resolution,
        purchasedPowerups: state.resolution.purchasedPowerups
          ? [...state.resolution.purchasedPowerups]
          : undefined,
      }
    : null;
}

function embeddedGameCommonView(state: GranRondaState) {
  const embedded = state.miniGame.embeddedGame;
  if (!embedded) return null;
  if (embedded.gameId === 'chinchon') return getChinchonTableView(embedded);
  if (embedded.gameId === 'pocha') return getPochaTableView(embedded);
  if (embedded.gameId === 'musical') return getMusicalTableView(embedded);
  if (isPartyEmbeddedGame(embedded)) return getPartyTableView(embedded);
  if (isRoadmapEmbeddedGame(embedded)) return getRoadmapTableView(embedded);
  if (embedded.gameId === 'preciojusto') return getPrecioJustoTableView(embedded);
  if (embedded.gameId === 'laronda') return getRondaTableView(embedded);
  return getClassicTableView(embedded);
}

function embeddedGamePlayerView(state: GranRondaState, playerId: PlayerId) {
  const embedded = state.miniGame.embeddedGame;
  if (!embedded) return null;
  if (embedded.gameId === 'chinchon') return getChinchonPlayerView(embedded, playerId);
  if (embedded.gameId === 'pocha') return getPochaPlayerView(embedded, playerId);
  if (embedded.gameId === 'musical') return getMusicalPlayerView(embedded, playerId);
  if (isPartyEmbeddedGame(embedded)) return getPartyPlayerView(embedded, playerId);
  if (isRoadmapEmbeddedGame(embedded)) return getRoadmapPlayerView(embedded, playerId);
  if (embedded.gameId === 'preciojusto') return getPrecioJustoPlayerView(embedded, playerId);
  if (embedded.gameId === 'laronda') return getRondaPlayerView(embedded, playerId);
  return getClassicPlayerView(embedded, playerId);
}

function isPartyEmbeddedGame(
  game: NonNullable<GranRondaState['miniGame']['embeddedGame']>,
): game is PartyState {
  return (
    game.gameId === 'orden' ||
    game.gameId === 'colores' ||
    game.gameId === 'mayoria' ||
    game.gameId === 'escala' ||
    game.gameId === 'matiz'
  );
}

function isRoadmapEmbeddedGame(
  game: NonNullable<GranRondaState['miniGame']['embeddedGame']>,
): game is RoadmapState {
  return (
    game.gameId === 'banderas' ||
    game.gameId === 'cifras' ||
    game.gameId === 'quienloharia' ||
    game.gameId === 'completalafrase'
  );
}

function miniGame(state: GranRondaState): GranRondaMiniGamePublic {
  const question = granRondaMiniGameById(state.miniGame.questionId);
  const revealed = state.phase === 'minigameReveal' || state.status === 'gameEnd';
  return {
    id: question.id,
    gameId: question.id,
    title: question.title,
    prompt: question.prompt,
    instructions: question.instructions,
    options: question.options.map((option) => ({ ...option })),
    submittedPlayerIds: Object.keys(state.miniGame.submissions),
    completedPlayerIds: activeGranRondaPlayers(state)
      .filter((player) => state.miniGame.playerStates[player.playerId]?.finished)
      .map((player) => player.playerId),
    correctOptionId: null,
    answers: revealed ? { ...state.miniGame.submissions } : null,
    scoreDeltas: revealed && state.miniGame.scoreDeltas ? { ...state.miniGame.scoreDeltas } : null,
    results:
      revealed && state.miniGame.results
        ? Object.fromEntries(
            Object.entries(state.miniGame.results).map(([playerId, result]) => [
              playerId,
              { ...result },
            ]),
          )
        : null,
    embeddedGame: embeddedGameCommonView(state),
  };
}

function common(state: GranRondaState): GranRondaCommonView {
  const turnPlayerId =
    state.turnSeat === null ? null : (state.players[state.turnSeat]?.playerId ?? null);
  return {
    roomCode: state.roomCode,
    status: state.status,
    round: state.round,
    players: publicPlayers(state),
    turnPlayerId,
    winnerId: state.winnerId,
    rematchVotes: [...state.rematchVotes],
    gameId: 'granronda',
    config: state.config,
    phase: state.phase,
    board: state.board.map((space) => ({ ...space, nextIds: [...space.nextIds] })),
    boardPlayers: boardPlayers(state),
    stampSpaceId: state.stampSpaceId,
    stampCost: state.stampCost,
    stampValue: state.stampValue,
    trapSpaceIds: [...state.trapSpaceIds],
    routeOptions: state.phase === 'routeChoice' ? [...(state.movement?.routeOptions ?? [])] : [],
    movement: movement(state),
    resolution: resolution(state),
    lastInteraction: state.lastInteraction ? { ...state.lastInteraction } : null,
    duel: state.duel
      ? {
          actorPlayerId: state.duel.actorPlayerId,
          targetPlayerId: state.duel.targetPlayerId,
          wager: state.duel.wager,
          gameId: state.duel.gameId,
        }
      : null,
    miniGame: miniGame(state),
  };
}

function buildMe(state: GranRondaState, playerId: PlayerId): GranRondaPlayerViewMe {
  const player = granRondaPlayer(state, playerId);
  const availableActions: GranRondaAvailableAction[] = [];
  if (!player) {
    return {
      playerId,
      position: 'salida',
      coins: 0,
      seals: 0,
      powerups: { doubleRoll: 0, rivalPenalty: 0, goldDuel: 0 },
      embeddedGame: null,
      miniGame: null,
      selectedOptionId: null,
      availableActions,
    };
  }

  if (state.status === 'playing' && !player.left) {
    if (state.phase === 'movement' && state.turnSeat === player.seat) {
      availableActions.push('rollGranRonda');
    }
    if (state.phase === 'moving' && state.movement?.playerId === playerId) {
      availableActions.push('advanceGranRondaMovement');
    }
    if (state.phase === 'routeChoice' && state.turnSeat === player.seat) {
      availableActions.push('chooseGranRondaPath');
    }
    if (state.phase === 'resolving' && state.movement?.playerId === playerId) {
      availableActions.push('continueGranRondaResolution');
      if (
        state.resolution?.kind === 'sello' &&
        state.resolution.spaceId === state.stampSpaceId &&
        player.coins >= state.stampCost
      ) {
        availableActions.push('buyGranRondaSeal');
      }
      if (
        state.resolution?.kind === 'tienda' &&
        (Object.entries(GRAN_RONDA_POWERUP_COSTS) as [GranRondaPowerupType, number][]).some(
          ([powerup, cost]) =>
            !state.resolution?.purchasedPowerups?.includes(powerup) && player.coins >= cost,
        )
      ) {
        availableActions.push('buyGranRondaPowerup');
      }
    }
    if (state.phase === 'movement' && state.turnSeat === player.seat) {
      if (
        player.powerups.doubleRoll > 0 ||
        player.powerups.rivalPenalty > 0 ||
        player.powerups.goldDuel > 0
      ) {
        availableActions.push('useGranRondaPowerup');
      }
    }
    const embeddedView =
      state.phase === 'minigameInput' ? embeddedGamePlayerView(state, playerId) : null;
    if (embeddedView) {
      if (embeddedView.me.availableActions.length > 0) {
        availableActions.push('submitGranRondaMiniGameAction');
      }
    } else if (
      state.phase === 'minigameInput' &&
      !state.miniGame.playerStates[playerId]?.finished
    ) {
      availableActions.push('submitGranRondaAnswer');
    }
    if (
      state.phase === 'minigameInput' &&
      player.seat === 0 &&
      state.miniGame.embeddedGame === null
    ) {
      availableActions.push('finishGranRondaMiniGame');
    }
    if (
      state.phase === 'minigameReveal' &&
      state.status === 'playing' &&
      state.duel?.actorPlayerId === playerId
    ) {
      availableActions.push('continueGranRondaDuel');
    } else if (
      state.phase === 'minigameReveal' &&
      state.status === 'playing' &&
      !state.duel &&
      player.seat === 0
    ) {
      availableActions.push('nextRound');
    }
  }

  return {
    playerId,
    position: player.position,
    coins: player.coins,
    seals: player.seals,
    powerups: { ...player.powerups },
    embeddedGame: state.phase === 'minigameInput' ? embeddedGamePlayerView(state, playerId) : null,
    miniGame:
      state.phase === 'minigameInput'
        ? {
            ...(state.miniGame.playerStates[playerId] ?? {
              score: 0,
              lastCard: null,
              finished: false,
              actions: 0,
            }),
          }
        : null,
    selectedOptionId: state.miniGame.submissions[playerId] ?? null,
    availableActions,
  };
}

export function getPlayerView(state: GranRondaState, playerId: PlayerId): GranRondaPlayerView {
  return { kind: 'player', ...common(state), me: buildMe(state, playerId) };
}

export function getTableView(state: GranRondaState): GranRondaTableView {
  return { kind: 'table', ...common(state) };
}

export function granRondaStandings(state: GranRondaState): GranRondaState['players'] {
  return [...activeGranRondaPlayers(state)].sort(
    (left, right) => right.seals - left.seals || right.coins - left.coins || left.seat - right.seat,
  );
}
