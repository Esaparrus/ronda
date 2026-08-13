// Vistas censuradas de los modos sociales.
//
// La mano numérica y el objetivo de Escala son secretos. Las respuestas se
// mantienen ocultas hasta que todos han contestado; después se publican a la
// vez en la vista común y en la pantalla central.

import {
  type ColoresCommonView,
  type ColoresPlayerView,
  type ColoresTableView,
  type EscalaCommonView,
  type EscalaPlayerView,
  type EscalaTableView,
  type MayoriaCommonView,
  type MayoriaPlayerView,
  type MayoriaTableView,
  type OrdenCommonView,
  type OrdenPlayerView,
  type OrdenTableView,
  type PartyAvailableAction,
  type PartyPlayerView,
  type PartyPlayerViewMe,
  type PartyTableView,
  type PlayerId,
  type PublicPlayer,
} from '@ronda/protocol';
import {
  colorQuestionById,
  majorityQuestionById,
  scaleQuestionById,
} from './content.ts';
import type { PartyState } from './state.ts';

function colorIndex(seat: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return (seat % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

function buildPublicPlayers(state: PartyState): PublicPlayer[] {
  return state.players.map((player) => ({
    playerId: player.playerId,
    nick: player.nick,
    seat: player.seat,
    colorIndex: colorIndex(player.seat),
    score: player.score,
    handCount: player.hand.length,
    connected: true,
    isHost: player.seat === 0,
    eliminated: false,
    teamIndex: null,
  }));
}

function commonFields(state: PartyState) {
  return {
    roomCode: state.roomCode,
    status: state.status,
    round: state.round,
    players: buildPublicPlayers(state),
    winnerId: state.winnerId,
    rematchVotes: state.rematchVotes,
  };
}

function buildOrdenCommon(state: PartyState): OrdenCommonView {
  const config = state.config;
  if (config.gameId !== 'orden' || !state.order) throw new Error('Estado inválido de Orden');
  return {
    ...commonFields(state),
    gameId: 'orden',
    config,
    phase: state.phase,
    turnPlayerId: null,
    party: {
      gameId: 'orden',
      phase: state.phase,
      round: state.round,
      cardsPerPlayer: state.order.cardsPerPlayer,
      nextCardsPerPlayer: state.order.nextCardsPerPlayer,
      deckCount: state.order.numberDeck.length,
      highest: state.order.highest,
      played: state.order.played.map((played) => ({ ...played })),
      failure: state.order.failure ? { ...state.order.failure } : null,
    },
  };
}

function buildColoresCommon(state: PartyState): ColoresCommonView {
  const config = state.config;
  if (config.gameId !== 'colores' || !state.colors) throw new Error('Estado inválido de Colores');
  const question = colorQuestionById(state.colors.questionId);
  const revealed = state.phase === 'reveal';
  return {
    ...commonFields(state),
    gameId: 'colores',
    config,
    phase: state.phase,
    turnPlayerId: null,
    party: {
      gameId: 'colores',
      phase: state.phase,
      questionId: question.id,
      prompt: question.prompt,
      allowMultiple: question.allowMultiple,
      submittedPlayerIds: Object.keys(state.colors.submissions),
      correctColors: revealed ? [...question.correctColors] : null,
      answers: revealed ? cloneColorAnswers(state.colors.submissions) : null,
    },
  };
}

function buildMayoriaCommon(state: PartyState): MayoriaCommonView {
  const config = state.config;
  if (config.gameId !== 'mayoria' || !state.majority) throw new Error('Estado inválido de Mayoría');
  const question = majorityQuestionById(state.majority.questionId);
  const revealed = state.phase === 'reveal';
  return {
    ...commonFields(state),
    gameId: 'mayoria',
    config,
    phase: state.phase,
    turnPlayerId: null,
    party: {
      gameId: 'mayoria',
      phase: state.phase,
      questionId: question.id,
      prompt: question.prompt,
      submittedPlayerIds: Object.keys(state.majority.submissions),
      answers: revealed ? { ...state.majority.submissions } : null,
      majorityAnswers: revealed && state.majority.majorityAnswers
        ? [...state.majority.majorityAnswers]
        : null,
    },
  };
}

function buildEscalaCommon(state: PartyState): EscalaCommonView {
  const config = state.config;
  if (config.gameId !== 'escala' || !state.scale) throw new Error('Estado inválido de Escala');
  const question = scaleQuestionById(state.scale.questionId);
  const revealed = state.phase === 'reveal';
  return {
    ...commonFields(state),
    gameId: 'escala',
    config,
    phase: state.phase,
    turnPlayerId: state.scale.cluePlayerId,
    party: {
      gameId: 'escala',
      phase: state.phase,
      questionId: question.id,
      leftLabel: question.leftLabel,
      rightLabel: question.rightLabel,
      cluePlayerId: state.scale.cluePlayerId,
      target: revealed ? state.scale.target : null,
      guesses: revealed ? { ...state.scale.guesses } : null,
    },
  };
}

function buildMe(state: PartyState, playerId: PlayerId): PartyPlayerViewMe {
  const player = state.players.find((candidate) => candidate.playerId === playerId);
  if (!player) {
    return {
      playerId,
      hand: [],
      submitted: false,
      scaleTarget: null,
      availableActions: [],
    };
  }

  const availableActions: PartyAvailableAction[] = [];
  if (
    state.status === 'playing' &&
    state.phase === 'reveal' &&
    state.gameId === 'orden' &&
    player.seat === 0
  ) {
    availableActions.push('setOrderCards');
  }
  if (state.status === 'playing' && state.phase === 'input') {
    if (state.gameId === 'orden' && player.hand.length > 0) {
      availableActions.push('playNumber');
    } else if (state.gameId === 'colores' && state.colors && !state.colors.submissions[playerId]) {
      availableActions.push('submitColors');
    } else if (state.gameId === 'mayoria' && state.majority && !state.majority.submissions[playerId]) {
      availableActions.push('submitMajority');
    } else if (
      state.gameId === 'escala' &&
      state.scale &&
      playerId !== state.scale.cluePlayerId &&
      state.scale.guesses[playerId] === undefined
    ) {
      availableActions.push('submitScale');
    }
  }
  if (state.status === 'playing' && state.phase === 'reveal') availableActions.push('nextRound');

  const submitted =
    state.gameId === 'colores'
      ? state.colors?.submissions[playerId] !== undefined
      : state.gameId === 'mayoria'
        ? state.majority?.submissions[playerId] !== undefined
        : state.gameId === 'escala'
          ? state.scale?.guesses[playerId] !== undefined
          : false;

  return {
    playerId,
    hand: state.gameId === 'orden' ? player.hand.map((card) => Number(card)) : [],
    submitted,
    scaleTarget:
      state.gameId === 'escala' && state.scale?.cluePlayerId === playerId
        ? state.scale.target
        : null,
    availableActions,
  };
}

export function getPlayerView(state: PartyState, playerId: PlayerId): PartyPlayerView {
  const me = buildMe(state, playerId);
  if (state.gameId === 'orden') {
    const common = buildOrdenCommon(state);
    const view: OrdenPlayerView = { kind: 'player', ...common, me };
    return view;
  }
  if (state.gameId === 'colores') {
    const common = buildColoresCommon(state);
    const view: ColoresPlayerView = { kind: 'player', ...common, me };
    return view;
  }
  if (state.gameId === 'mayoria') {
    const common = buildMayoriaCommon(state);
    const view: MayoriaPlayerView = { kind: 'player', ...common, me };
    return view;
  }
  const common = buildEscalaCommon(state);
  const view: EscalaPlayerView = { kind: 'player', ...common, me };
  return view;
}

export function getTableView(state: PartyState): PartyTableView {
  if (state.gameId === 'orden') {
    const view: OrdenTableView = { kind: 'table', ...buildOrdenCommon(state) };
    return view;
  }
  if (state.gameId === 'colores') {
    const view: ColoresTableView = { kind: 'table', ...buildColoresCommon(state) };
    return view;
  }
  if (state.gameId === 'mayoria') {
    const view: MayoriaTableView = { kind: 'table', ...buildMayoriaCommon(state) };
    return view;
  }
  const view: EscalaTableView = { kind: 'table', ...buildEscalaCommon(state) };
  return view;
}

function cloneColorAnswers(answers: Record<PlayerId, string[]>): Record<PlayerId, string[]> {
  return Object.fromEntries(
    Object.entries(answers).map(([playerId, colors]) => [playerId, [...colors]]),
  ) as Record<PlayerId, string[]>;
}
