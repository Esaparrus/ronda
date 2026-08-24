import type {
  GranRondaBoardPlayer,
  GranRondaCommonView,
  GranRondaMiniGamePublic,
  GranRondaMovementPublic,
  GranRondaPlayerView,
  GranRondaPlayerViewMe,
  GranRondaResolutionPublic,
  GranRondaTableView,
  GranRondaAvailableAction,
  PlayerId,
  PublicPlayer,
} from '@ronda/protocol';
import { granRondaMiniGameById } from './content.ts';
import { granRondaSpaceById } from './rules.ts';
import { activeGranRondaPlayers, granRondaPlayer, type GranRondaState } from './state.ts';

function publicPlayers(state: GranRondaState): PublicPlayer[] {
  return state.players.map((player) => ({
    playerId: player.playerId,
    nick: player.nick,
    seat: player.seat,
    isBot: player.isBot,
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
    lastRoll: player.lastRoll,
    lastSpaceId: player.lastSpaceId,
  }));
}

function movement(state: GranRondaState): GranRondaMovementPublic | null {
  return state.movement ? { ...state.movement, path: [...state.movement.path], routeOptions: [...state.movement.routeOptions] } : null;
}

function resolution(state: GranRondaState): GranRondaResolutionPublic | null {
  return state.resolution ? { ...state.resolution } : null;
}

function miniGame(state: GranRondaState): GranRondaMiniGamePublic {
  const question = granRondaMiniGameById(state.miniGame.questionId);
  const revealed = state.phase === 'minigameReveal' || state.status === 'gameEnd';
  return {
    id: question.id,
    title: question.title,
    prompt: question.prompt,
    options: question.options.map((option) => ({ ...option })),
    submittedPlayerIds: Object.keys(state.miniGame.submissions),
    correctOptionId: revealed ? question.correctOptionId : null,
    answers: revealed ? { ...state.miniGame.submissions } : null,
    scoreDeltas: revealed && state.miniGame.scoreDeltas ? { ...state.miniGame.scoreDeltas } : null,
  };
}

function common(state: GranRondaState): GranRondaCommonView {
  const turnPlayerId = state.turnSeat === null ? null : state.players[state.turnSeat]?.playerId ?? null;
  const turnPlayer = turnPlayerId ? granRondaPlayer(state, turnPlayerId) : undefined;
  const currentSpace = turnPlayer ? granRondaSpaceById(turnPlayer.position) : undefined;
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
    routeOptions: state.phase === 'routeChoice' ? [...(currentSpace?.nextIds ?? [])] : [],
    movement: movement(state),
    resolution: resolution(state),
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
    }
    if (state.phase === 'minigameInput' && state.miniGame.submissions[playerId] === undefined) {
      availableActions.push('submitGranRondaAnswer');
    }
    if (state.phase === 'minigameInput' && player.seat === 0) {
      availableActions.push('finishGranRondaMiniGame');
    }
    if (state.phase === 'roundEnd' && state.status === 'playing' && player.seat === 0) {
      availableActions.push('nextRound');
    }
  }

  return {
    playerId,
    position: player.position,
    coins: player.coins,
    seals: player.seals,
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
