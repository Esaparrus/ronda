import type {
  PlayerId,
  PublicPlayer,
  RondaAvailableAction,
  RondaCommonView,
  RondaPlayerView,
  RondaTableView,
  RondaTapasPile,
} from '@ronda/protocol';
import { rondaCardById, rondaCardView, rondaCardViewById } from './cards.ts';
import {
  availableBillModes,
  availableBillTargets,
  calculateRondaBill,
  canAskRondaBill,
  cheapestEffectiveTapa,
  legalBlockTargets,
  legalOrderingCardIds,
  wineCostCents,
} from './rules.ts';
import { RONDA_TAPA_TYPES, rondaPlayer, type RondaState } from './state.ts';

function publicPlayers(state: RondaState): PublicPlayer[] {
  return state.players.map((player) => ({
    playerId: player.playerId,
    nick: player.nick,
    seat: player.seat,
    colorIndex: player.seat as PublicPlayer['colorIndex'],
    score: player.score,
    handCount: player.hand.length,
    connected: true,
    isHost: player.seat === 0,
    eliminated: player.score <= 0,
    teamIndex: null,
  }));
}

function publicTapas(state: RondaState): RondaTapasPile[] {
  return RONDA_TAPA_TYPES.map((type) => {
    const cards = state.tapas[type].map((played) => {
      const card = rondaCardById(played.cardId);
      return {
        cardId: played.cardId,
        name: card?.name ?? 'Tapa',
        priceCents: played.priceCents,
        effectivePriceCents: played.effectivePriceCents,
        premium: played.premiumCardId !== null,
      };
    });
    return {
      type,
      blocked: state.blockedTypes.includes(type),
      topPriceCents: cards[cards.length - 1]?.effectivePriceCents ?? null,
      cards,
    };
  });
}

function common(state: RondaState): RondaCommonView {
  const bill = state.bill;
  const responderSeat =
    bill && bill.responderSeats.length > 0
      ? bill.responderSeats[bill.responderIndex]
      : undefined;
  return {
    roomCode: state.roomCode,
    gameId: 'laronda',
    config: state.config,
    status: state.status,
    phase: state.phase,
    round: state.round,
    players: publicPlayers(state),
    turnPlayerId:
      state.turnSeat === null ? null : (state.players[state.turnSeat]?.playerId ?? null),
    winnerId: state.winnerId,
    winnerIds: [...state.winnerIds],
    rematchVotes: [...state.rematchVotes],
    direction: state.direction,
    orderingCardCount: state.orderingCardCount,
    deckCount: state.deck.length,
    tapas: publicTapas(state),
    wineCount: state.wineCardIds.length,
    wineCostCents: wineCostCents(state.wineCardIds.length),
    publicCards: state.publicSpecialCardIds
      .map(rondaCardViewById)
      .filter((card) => card !== null),
    ordersClosed: state.ordersClosed,
    billPreviewCents: calculateRondaBill(state),
    billRequesterId:
      bill === null ? null : (state.players[bill.requesterSeat]?.playerId ?? null),
    billMode: bill?.mode ?? null,
    billTargetId:
      bill?.targetSeat === null || bill?.targetSeat === undefined
        ? null
        : (state.players[bill.targetSeat]?.playerId ?? null),
    billResponderId:
      responderSeat === undefined ? null : (state.players[responderSeat]?.playerId ?? null),
    passedPlayerIds:
      bill?.passedSeats.map((seat) => state.players[seat]?.playerId).filter(Boolean) as PlayerId[] ?? [],
    protectedPlayerIds: state.players
      .filter((player) => player.toilette || player.celebration)
      .map((player) => player.playerId),
    roundResult: state.roundResult
      ? {
          ...state.roundResult,
          payments: state.roundResult.payments.map((payment) => ({ ...payment })),
        }
      : null,
  };
}

export function getRondaPlayerView(state: RondaState, playerId: PlayerId): RondaPlayerView {
  const player = rondaPlayer(state, playerId);
  const availableActions: RondaAvailableAction[] = [];
  let legalCardIds: string[] = [];
  let billModes: RondaPlayerView['me']['availableBillModes'] = [];
  let targetPlayerIds: PlayerId[] = [];
  let targetTypes: RondaPlayerView['me']['legalTargetTypes'] = [];

  if (player && state.status === 'roundEnd') {
    availableActions.push('nextRound');
  } else if (player && state.status === 'playing') {
    if (state.phase === 'ordering' && state.turnSeat === player.seat) {
      legalCardIds = legalOrderingCardIds(state, player);
      targetTypes = legalBlockTargets(state);
      if (legalCardIds.length > 0) availableActions.push('playRondaCard');
      if (canAskRondaBill(state, player)) availableActions.push('askRondaBill');
      if (player.celebration) availableActions.push('skipRondaTurn');
    } else if (state.phase === 'billChoice' && state.bill?.requesterSeat === player.seat) {
      availableActions.push('chooseRondaBillMode');
      billModes = availableBillModes(state, player);
      targetPlayerIds = availableBillTargets(state, player).map((target) => target.playerId);
    }

    const responderSeat = state.bill?.responderSeats[state.bill.responderIndex];
    if (state.phase === 'tips' && responderSeat === player.seat) {
      availableActions.push('passRondaBill');
      const canTip =
        cheapestEffectiveTapa(state) !== null &&
        player.hand.some((cardId) => rondaCardById(cardId)?.kind === 'servicio');
      if (canTip) availableActions.push('playRondaTip');
    }
    if (state.phase === 'discard' && state.bill?.requesterSeat === player.seat) {
      availableActions.push('confirmRondaDiscards');
    }
  }

  return {
    kind: 'player',
    ...common(state),
    me: {
      playerId,
      hand: player
        ? player.hand.flatMap((cardId) => {
            const card = rondaCardById(cardId);
            return card ? [rondaCardView(card)] : [];
          })
        : [],
      legalCardIds,
      legalTargetTypes: targetTypes,
      legalTargetPlayerIds: targetPlayerIds,
      availableBillModes: billModes,
      availableActions,
    },
  };
}

export function getRondaTableView(state: RondaState): RondaTableView {
  return { kind: 'table', ...common(state) };
}
