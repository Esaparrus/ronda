import {
  type ClassicAvailableAction,
  type ClassicCommonView,
  type ClassicPlayerView,
  type ClassicTableView,
  type PlayerId,
  type PublicPlayer,
} from '@ronda/protocol';
import { sevenHalfTotal } from './rules.ts';
import { legalCardsFor } from './reducer.ts';
import type { ClassicState } from './state.ts';

function publicPlayers(state: ClassicState): PublicPlayer[] {
  return state.players.map((player) => ({
    playerId: player.playerId,
    nick: player.nick,
    seat: player.seat,
    colorIndex: player.seat as PublicPlayer['colorIndex'],
    score: player.score,
    handCount: player.hand.length,
    connected: true,
    isHost: player.seat === 0,
    eliminated: false,
    teamIndex: null,
  }));
}

function common(state: ClassicState): ClassicCommonView {
  return {
    roomCode: state.roomCode,
    gameId: state.gameId,
    config: state.config,
    status: state.status,
    phase: state.phase,
    round: state.round,
    players: publicPlayers(state),
    turnPlayerId: state.turnSeat === null ? null : (state.players[state.turnSeat]?.playerId ?? null),
    winnerId: state.winnerId,
    rematchVotes: state.rematchVotes,
    deckCount: state.deck.length,
    trumpCardId: state.trumpCardId,
    trumpSuit: state.trumpSuit,
    currentTrick: state.currentTrick.map((card) => ({
      playerId: state.players[card.seat]?.playerId ?? '',
      cardId: card.cardId,
    })),
    tableCards: [...state.tableCards],
    capturedCounts: state.players.map((player) => player.captured.length),
    escobas: state.players.map((player) => player.escobas),
    bankerPlayerId:
      state.bankerSeat === null ? null : (state.players[state.bankerSeat]?.playerId ?? null),
    totals: state.players.map((player) =>
      state.gameId === 'sieteymedia' && (player.revealed || state.status === 'gameEnd')
        ? sevenHalfTotal(player.hand)
        : null,
    ),
    stoodPlayerIds: state.players.filter((player) => player.stood).map((player) => player.playerId),
    bustPlayerIds: state.players.filter((player) => player.bust).map((player) => player.playerId),
    revealedHands: state.players
      .filter((player) => player.revealed || state.status === 'gameEnd')
      .map((player) => ({ playerId: player.playerId, cards: [...player.hand] })),
  };
}

export function getClassicPlayerView(state: ClassicState, playerId: PlayerId): ClassicPlayerView {
  const player = state.players.find((candidate) => candidate.playerId === playerId);
  const isTurn = player !== undefined && state.status === 'playing' && state.turnSeat === player.seat;
  const availableActions: ClassicAvailableAction[] = [];
  if (isTurn && player) {
    if (state.gameId === 'brisca' || state.gameId === 'tute' || state.gameId === 'cinquillo') {
      if (legalCardsFor(state, player).length > 0) availableActions.push('playCard');
      else if (state.gameId === 'cinquillo') availableActions.push('pass');
    } else if (state.gameId === 'escoba') {
      availableActions.push('playCapture');
    } else {
      availableActions.push('drawDeck', 'stand');
    }
  }
  return {
    kind: 'player',
    ...common(state),
    me: {
      playerId,
      hand: player ? [...player.hand] : [],
      legalCardIds: player && isTurn ? legalCardsFor(state, player) : [],
      total: player && state.gameId === 'sieteymedia' ? sevenHalfTotal(player.hand) : null,
      availableActions,
    },
  };
}

export function getClassicTableView(state: ClassicState): ClassicTableView {
  return { kind: 'table', ...common(state) };
}
