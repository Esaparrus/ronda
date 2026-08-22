import type {
  PlayerId,
  PrecioJustoCommonView,
  PrecioJustoGuessReveal,
  PrecioJustoPlayerView,
  PrecioJustoPlayerViewMe,
  PrecioJustoProductPublic,
  PrecioJustoTableView,
  PublicPlayer,
} from '@ronda/protocol';
import { priceQuestionById } from './content.ts';
import { findPlayer, type PrecioJustoState } from './state.ts';
import { activePlayers } from './state.ts';

function colorIndex(seat: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  return (seat % 8) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

function buildPublicPlayers(state: PrecioJustoState): PublicPlayer[] {
  const hostId = activePlayers(state).sort((left, right) => left.seat - right.seat)[0]?.playerId;
  return state.players.map((player) => ({
    playerId: player.playerId,
    nick: player.nick,
    seat: player.seat,
    isBot: player.isBot,
    colorIndex: colorIndex(player.seat),
    score: player.score,
    handCount: 0,
    connected: true,
    isHost: hostId === player.playerId,
    eliminated: player.left,
    teamIndex: null,
  }));
}

function publicProduct(state: PrecioJustoState): PrecioJustoProductPublic {
  const question = priceQuestionById(state.price.questionId, state.questions);
  return {
    id: question.id,
    title: question.title,
    image: question.image,
    asin: question.asin,
    detailPageUrl: question.detailPageUrl,
    category: question.category,
    brandModel: question.brandModel,
    variant: question.variant,
    marketplace: question.marketplace,
    currency: question.currency,
    seller: question.seller,
    conditions: question.conditions,
    source: question.source,
    capturedAt: question.capturedAt,
  };
}

function common(state: PrecioJustoState): PrecioJustoCommonView {
  const revealed = state.phase === 'reveal';
  return {
    roomCode: state.roomCode,
    status: state.status,
    round: state.round,
    players: buildPublicPlayers(state),
    turnPlayerId: null,
    winnerId: state.winnerId,
    rematchVotes: [...state.rematchVotes],
    gameId: 'preciojusto',
    config: state.config,
    phase: state.phase,
    price: {
      gameId: 'preciojusto',
      phase: state.phase,
      product: publicProduct(state),
      referencePriceCents: revealed
        ? priceQuestionById(state.price.questionId, state.questions).referencePriceCents
        : null,
      deadlineAt: state.price.deadlineAt,
      submittedPlayerIds: Object.keys(state.price.submissions),
      guesses: revealed ? buildGuesses(state) : null,
      scoreDeltas: revealed && state.price.scoreDeltas ? { ...state.price.scoreDeltas } : null,
    },
  };
}

function buildGuesses(state: PrecioJustoState): Record<PlayerId, PrecioJustoGuessReveal> | null {
  if (!state.price.results) return null;
  return Object.fromEntries(
    Object.entries(state.price.results).map(([playerId, result]) => [playerId, { ...result }]),
  ) as Record<PlayerId, PrecioJustoGuessReveal>;
}

function buildMe(state: PrecioJustoState, playerId: PlayerId): PrecioJustoPlayerViewMe {
  const player = findPlayer(state, playerId);
  if (!player) return { playerId, submitted: false, availableActions: [] };

  const availableActions: PrecioJustoPlayerViewMe['availableActions'] = [];
  const submitted = state.price.submissions[playerId] !== undefined;
  const hostId = activePlayers(state).sort((left, right) => left.seat - right.seat)[0]?.playerId;

  if (state.status === 'playing' && state.phase === 'input' && !player.left && !submitted) {
    availableActions.push('submitPrice');
  }
  if (
    state.status === 'playing' &&
    state.phase === 'input' &&
    !player.left &&
    hostId === playerId &&
    state.config.answerTimeSeconds === 0
  ) {
    availableActions.push('finishPrice');
  }
  if (state.status === 'playing' && state.phase === 'reveal' && !player.left && hostId === playerId) {
    availableActions.push('nextRound');
  }

  return { playerId, submitted, availableActions };
}

export function getPlayerView(state: PrecioJustoState, playerId: PlayerId): PrecioJustoPlayerView {
  return { kind: 'player', ...common(state), me: buildMe(state, playerId) };
}

export function getTableView(state: PrecioJustoState): PrecioJustoTableView {
  return { kind: 'table', ...common(state) };
}
