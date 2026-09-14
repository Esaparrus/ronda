import {
  err,
  ok,
  type GameAction,
  type GameEvent,
  type LaRondaConfig,
  type PlayerId,
  type Result,
} from '@ronda/protocol';
import { shuffle } from '../../core/rng.ts';
import { buildRondaDeck, rondaCardById } from './cards.ts';
import {
  availableBillModes,
  availableBillTargets,
  calculateRondaBill,
  canAskRondaBill,
  cheapestEffectiveTapa,
  isOrderingCardLegal,
  legalBlockTargets,
  legalOrderingCardIds,
} from './rules.ts';
import {
  activeRondaPlayers,
  nextRondaSeat,
  rondaPlayer,
  type RondaBillState,
  type RondaPlayer,
  type RondaState,
} from './state.ts';

function cloneState(state: RondaState): RondaState {
  return {
    ...state,
    rng: { ...state.rng },
    players: state.players.map((player) => ({ ...player, hand: [...player.hand] })),
    deck: [...state.deck],
    discard: [...state.discard],
    tapas: {
      carne: state.tapas.carne.map((card) => ({ ...card })),
      pescado: state.tapas.pescado.map((card) => ({ ...card })),
      vegetal: state.tapas.vegetal.map((card) => ({ ...card })),
    },
    blockedTypes: [...state.blockedTypes],
    wineCardIds: [...state.wineCardIds],
    publicSpecialCardIds: [...state.publicSpecialCardIds],
    playedCardIds: [...state.playedCardIds],
    bill: state.bill
      ? {
          ...state.bill,
          responderSeats: [...state.bill.responderSeats],
          passedSeats: [...state.bill.passedSeats],
          tipCardIds: [...state.bill.tipCardIds],
        }
      : null,
    roundResult: state.roundResult
      ? {
          ...state.roundResult,
          payments: state.roundResult.payments.map((payment) => ({ ...payment })),
        }
      : null,
    winnerIds: [...state.winnerIds],
    rematchVotes: [...state.rematchVotes],
  };
}

function removeFromHand(player: RondaPlayer, cardId: string): boolean {
  const index = player.hand.indexOf(cardId);
  if (index < 0) return false;
  player.hand.splice(index, 1);
  return true;
}

function refillDeck(state: RondaState): void {
  if (state.deck.length > 0 || state.discard.length === 0) return;
  const shuffled = shuffle(state.discard, state.rng.seed, state.rng.calls);
  state.deck = shuffled.items;
  state.discard = [];
  state.rng.calls = shuffled.calls;
}

function drawOne(state: RondaState): string | null {
  refillDeck(state);
  return state.deck.shift() ?? null;
}

function drawToLimit(state: RondaState, player: RondaPlayer): void {
  while (player.hand.length < player.handLimit) {
    const cardId = drawOne(state);
    if (!cardId) break;
    player.hand.push(cardId);
  }
}

function initialSavings(playerCount: number): number {
  return (600 + playerCount * 100) * 100;
}

export function createRondaState(input: {
  config: LaRondaConfig;
  players: { playerId: PlayerId; nick: string; seat: number }[];
  seed: string;
  roomCode?: string;
}): RondaState {
  if (input.config.gameId !== 'laronda') throw new Error('Config incorrecta para La Ronda');
  if (input.players.length < 3 || input.players.length > 8) {
    throw new Error(`La Ronda necesita de 3 a 8 jugadores, llegaron ${input.players.length}`);
  }

  const state: RondaState = {
    version: 0,
    status: 'playing',
    phase: 'ordering',
    config: input.config,
    gameId: 'laronda',
    roomCode: input.roomCode ?? '',
    rng: { seed: input.seed, calls: 0 },
    round: 1,
    turnSeat: 0,
    direction: 1,
    players: [...input.players]
      .sort((a, b) => a.seat - b.seat)
      .map((player) => ({
        ...player,
        score: initialSavings(input.players.length),
        hand: [],
        handLimit: 5,
        toilette: false,
        celebration: false,
        left: false,
      })),
    deck: [],
    discard: [],
    tapas: { carne: [], pescado: [], vegetal: [] },
    blockedTypes: [],
    wineCardIds: [],
    publicSpecialCardIds: [],
    playedCardIds: [],
    orderingCardCount: 0,
    ordersClosed: false,
    bill: null,
    roundResult: null,
    winnerId: null,
    winnerIds: [],
    rematchVotes: [],
  };

  const shuffled = shuffle(buildRondaDeck(), state.rng.seed, state.rng.calls);
  state.deck = shuffled.items;
  state.rng.calls = shuffled.calls;
  for (let card = 0; card < 5; card += 1) {
    for (const player of state.players) {
      const cardId = drawOne(state);
      if (cardId) player.hand.push(cardId);
    }
  }
  const starter = state.players[0];
  if (starter) ensureStarterCanPlay(state, starter);
  return state;
}

function advanceOrderingTurn(state: RondaState, fromSeat: number): void {
  const nextSeat = nextRondaSeat(state, fromSeat);
  state.turnSeat = nextSeat;
  if (nextSeat !== null) {
    const next = state.players[nextSeat];
    if (next?.toilette) next.toilette = false;
  }
}

function playOrderingCard(
  state: RondaState,
  player: RondaPlayer,
  action: Extract<GameAction, { type: 'playRondaCard' }>,
): Result<{ state: RondaState; events: GameEvent[] }> {
  if (!isOrderingCardLegal(state, player, action.cardId)) return err('INVALID_ACTION');
  const card = rondaCardById(action.cardId);
  if (!card) return err('INVALID_ACTION');

  let premiumCardId: string | null = null;
  if (action.premiumCardId) {
    const premium = rondaCardById(action.premiumCardId);
    if (
      !premium ||
      premium.kind !== 'premium' ||
      !player.hand.includes(action.premiumCardId) ||
      (card.kind !== 'tapa' && card.kind !== 'bloqueo')
    ) {
      return err('INVALID_ACTION');
    }
    premiumCardId = action.premiumCardId;
  }

  const next = cloneState(state);
  const nextPlayer = next.players[player.seat];
  if (!nextPlayer || !removeFromHand(nextPlayer, action.cardId)) return err('CARD_NOT_IN_HAND');
  next.playedCardIds.push(action.cardId);
  next.orderingCardCount += 1;
  if (premiumCardId) {
    if (!removeFromHand(nextPlayer, premiumCardId)) return err('CARD_NOT_IN_HAND');
    next.playedCardIds.push(premiumCardId);
    next.publicSpecialCardIds.push(premiumCardId);
    next.orderingCardCount += 1;
  }

  if (card.kind === 'tapa' && card.tapaType) {
    next.tapas[card.tapaType].push({
      cardId: card.id,
      priceCents: card.priceCents,
      effectivePriceCents: card.priceCents * (premiumCardId ? 2 : 1),
      premiumCardId,
    });
  } else if (card.kind === 'vino') {
    next.wineCardIds.push(card.id);
  } else if (card.kind === 'bloqueo') {
    const target = action.targetType;
    if (!target || !legalBlockTargets(state).includes(target)) return err('INVALID_ACTION');
    next.blockedTypes.push(target);
    next.publicSpecialCardIds.push(card.id);
  } else {
    next.publicSpecialCardIds.push(card.id);
    if (card.kind === 'giro') next.direction = next.direction === 1 ? -1 : 1;
    if (card.kind === 'toilette') nextPlayer.toilette = true;
    if (card.kind === 'sobremesa') next.ordersClosed = true;
    if (card.kind === 'celebracion') nextPlayer.celebration = true;
  }

  advanceOrderingTurn(next, nextPlayer.seat);
  next.version += 1;
  return ok({
    state: next,
    events: [
      {
        t: 'rondaCardPlayed',
        playerId: nextPlayer.playerId,
        cardId: card.id,
        premiumCardId,
      },
    ],
  });
}

function askBill(
  state: RondaState,
  player: RondaPlayer,
): Result<{ state: RondaState; events: GameEvent[] }> {
  if (!canAskRondaBill(state, player)) return err('INVALID_ACTION');
  const next = cloneState(state);
  next.phase = 'billChoice';
  next.bill = {
    requesterSeat: player.seat,
    mode: null,
    targetSeat: null,
    responderSeats: [],
    responderIndex: 0,
    passCount: 0,
    passedSeats: [],
    tipCardIds: [],
  };
  next.turnSeat = player.seat;
  next.version += 1;
  return ok({ state: next, events: [{ t: 'rondaBillAsked', playerId: player.playerId }] });
}

function responderOrder(state: RondaState, requesterSeat: number): number[] {
  const seats: number[] = [];
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const seat =
      (requesterSeat + state.direction * offset + state.players.length * 2) % state.players.length;
    const player = state.players[seat];
    if (player && !player.left && !player.toilette) seats.push(seat);
  }
  return seats;
}

function chooseBillMode(
  state: RondaState,
  player: RondaPlayer,
  action: Extract<GameAction, { type: 'chooseRondaBillMode' }>,
): Result<{ state: RondaState; events: GameEvent[] }> {
  if (state.phase !== 'billChoice' || !state.bill || state.bill.requesterSeat !== player.seat) {
    return err('INVALID_ACTION');
  }
  if (!availableBillModes(state, player).includes(action.mode)) return err('INVALID_ACTION');

  const next = cloneState(state);
  const requester = next.players[player.seat];
  const bill = next.bill;
  if (!requester || !bill) return err('INVALID_ACTION');

  if (action.mode === 'half') {
    const split = action.cardId ? rondaCardById(action.cardId) : null;
    const target = action.targetPlayerId
      ? next.players.find((candidate) => candidate.playerId === action.targetPlayerId)
      : null;
    if (
      !split ||
      split.kind !== 'mitad' ||
      !removeFromHand(requester, split.id) ||
      !target ||
      !availableBillTargets(state, player).some((candidate) => candidate.seat === target.seat)
    ) {
      return err('INVALID_ACTION');
    }
    bill.targetSeat = target.seat;
    next.playedCardIds.push(split.id);
    next.publicSpecialCardIds.push(split.id);
  } else if (action.mode === 'group') {
    const split = action.cardId ? rondaCardById(action.cardId) : null;
    if (!split || split.kind !== 'grupo' || !removeFromHand(requester, split.id)) {
      return err('INVALID_ACTION');
    }
    next.playedCardIds.push(split.id);
    next.publicSpecialCardIds.push(split.id);
  }

  bill.mode = action.mode;
  bill.responderSeats = responderOrder(next, requester.seat);
  bill.responderIndex = 0;
  next.phase = 'tips';
  next.turnSeat = bill.responderSeats[0] ?? null;

  const events: GameEvent[] = [];
  if (bill.responderSeats.length === 0) settleBill(next, events);
  next.version += 1;
  return ok({ state: next, events });
}

function currentResponder(state: RondaState): RondaPlayer | null {
  if (!state.bill || state.bill.responderSeats.length === 0) return null;
  const seat = state.bill.responderSeats[state.bill.responderIndex];
  return seat === undefined ? null : (state.players[seat] ?? null);
}

function moveResponder(state: RondaState): void {
  const bill = state.bill;
  if (!bill || bill.responderSeats.length === 0) {
    state.turnSeat = null;
    return;
  }
  bill.responderIndex = (bill.responderIndex + 1) % bill.responderSeats.length;
  state.turnSeat = bill.responderSeats[bill.responderIndex] ?? null;
}

function playTip(
  state: RondaState,
  player: RondaPlayer,
  cardId: string,
): Result<{ state: RondaState; events: GameEvent[] }> {
  if (state.phase !== 'tips' || currentResponder(state)?.seat !== player.seat) {
    return err('NOT_YOUR_TURN');
  }
  const card = rondaCardById(cardId);
  if (!card || card.kind !== 'servicio' || cheapestEffectiveTapa(state) === null) {
    return err('INVALID_ACTION');
  }

  const next = cloneState(state);
  const nextPlayer = next.players[player.seat];
  const bill = next.bill;
  if (!nextPlayer || !bill || !removeFromHand(nextPlayer, cardId)) return err('CARD_NOT_IN_HAND');
  bill.tipCardIds.push(cardId);
  bill.passCount = 0;
  bill.passedSeats = [];
  next.playedCardIds.push(cardId);
  next.publicSpecialCardIds.push(cardId);
  moveResponder(next);
  next.version += 1;
  return ok({
    state: next,
    events: [{ t: 'rondaTipPlayed', playerId: player.playerId, cardId }],
  });
}

function passBill(
  state: RondaState,
  player: RondaPlayer,
): Result<{ state: RondaState; events: GameEvent[] }> {
  if (state.phase !== 'tips' || currentResponder(state)?.seat !== player.seat || !state.bill) {
    return err('NOT_YOUR_TURN');
  }
  const next = cloneState(state);
  const bill = next.bill;
  if (!bill) return err('INVALID_ACTION');
  bill.passCount += 1;
  bill.passedSeats.push(player.seat);
  const events: GameEvent[] = [];
  if (bill.passCount >= bill.responderSeats.length) settleBill(next, events);
  else moveResponder(next);
  next.version += 1;
  return ok({ state: next, events });
}

function paymentRows(
  state: RondaState,
  bill: RondaBillState,
  totalCents: number,
): { player: RondaPlayer; amountCents: number }[] {
  const requester = state.players[bill.requesterSeat];
  if (!requester) return [];
  if (bill.mode === 'half') {
    const target = bill.targetSeat === null ? null : state.players[bill.targetSeat];
    if (!target) return [{ player: requester, amountCents: totalCents }];
    return [
      { player: requester, amountCents: Math.ceil(totalCents / 2) },
      { player: target, amountCents: Math.floor(totalCents / 2) },
    ];
  }
  if (bill.mode === 'group') {
    const payers = activeRondaPlayers(state).filter(
      (candidate) => !candidate.toilette && !candidate.celebration,
    );
    const share = Math.floor(totalCents / Math.max(1, payers.length));
    const remainder = totalCents - share * payers.length;
    return payers.map((candidate) => ({
      player: candidate,
      amountCents: share + (candidate.seat === requester.seat ? remainder : 0),
    }));
  }
  return [{ player: requester, amountCents: totalCents }];
}

function settleBill(state: RondaState, events: GameEvent[]): void {
  const bill = state.bill;
  if (!bill || !bill.mode) return;
  const requester = state.players[bill.requesterSeat];
  if (!requester) return;
  const totalCents = calculateRondaBill(state);
  const rows = paymentRows(state, bill, totalCents);
  for (const row of rows) row.player.score -= row.amountCents;

  const gameOver = activeRondaPlayers(state).some((player) => player.score <= 0);
  const qualifiesForIncrease = state.orderingCardCount >= activeRondaPlayers(state).length;
  const handIncrease = !gameOver && qualifiesForIncrease && requester.handLimit < 10 ? 1 : 0;
  if (handIncrease > 0) requester.handLimit += handIncrease;

  state.roundResult = {
    requesterId: requester.playerId,
    totalCents,
    mode: bill.mode,
    payments: rows.map((row) => ({
      playerId: row.player.playerId,
      amountCents: row.amountCents,
      balanceCents: row.player.score,
    })),
    handIncrease,
  };
  events.push({
    t: 'rondaBillPaid',
    totalCents,
    payments: rows.map((row) => ({
      playerId: row.player.playerId,
      amountCents: row.amountCents,
    })),
  });

  if (gameOver) {
    const best = Math.max(...activeRondaPlayers(state).map((player) => player.score));
    state.winnerIds = activeRondaPlayers(state)
      .filter((player) => player.score === best)
      .map((player) => player.playerId);
    state.winnerId = state.winnerIds[0] ?? null;
    state.status = 'gameEnd';
    state.turnSeat = null;
    if (state.winnerId) events.push({ t: 'gameOver', winnerId: state.winnerId });
    return;
  }

  if (!qualifiesForIncrease) {
    state.discard.push(...requester.hand);
    requester.hand = [];
    finishRound(state);
    return;
  }

  state.phase = 'discard';
  state.turnSeat = requester.seat;
}

function finishRound(state: RondaState): void {
  state.status = 'roundEnd';
  state.turnSeat = null;
}

function confirmDiscards(
  state: RondaState,
  player: RondaPlayer,
  cardIds: string[],
): Result<{ state: RondaState; events: GameEvent[] }> {
  if (
    state.phase !== 'discard' ||
    !state.bill ||
    state.bill.requesterSeat !== player.seat ||
    new Set(cardIds).size !== cardIds.length ||
    cardIds.some((cardId) => !player.hand.includes(cardId))
  ) {
    return err('INVALID_ACTION');
  }
  const next = cloneState(state);
  const nextPlayer = next.players[player.seat];
  if (!nextPlayer) return err('INVALID_ACTION');
  for (const cardId of cardIds) {
    if (removeFromHand(nextPlayer, cardId)) next.discard.push(cardId);
  }
  finishRound(next);
  next.version += 1;
  return ok({ state: next, events: [] });
}

function resetTable(state: RondaState): void {
  state.discard.push(...state.playedCardIds);
  state.tapas = { carne: [], pescado: [], vegetal: [] };
  state.blockedTypes = [];
  state.wineCardIds = [];
  state.publicSpecialCardIds = [];
  state.playedCardIds = [];
  state.orderingCardCount = 0;
  state.ordersClosed = false;
  state.bill = null;
}

function ensureStarterCanPlay(state: RondaState, starter: RondaPlayer): void {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (legalOrderingCardIds(state, starter).length > 0) return;
    state.discard.push(...starter.hand);
    starter.hand = [];
    drawToLimit(state, starter);
  }
}

function nextRound(
  state: RondaState,
): Result<{ state: RondaState; events: GameEvent[] }> {
  if (state.status !== 'roundEnd' || !state.roundResult) return err('INVALID_ACTION');
  const next = cloneState(state);
  const requester = next.players.find(
    (player) => player.playerId === next.roundResult?.requesterId,
  );
  resetTable(next);
  next.status = 'playing';
  next.phase = 'ordering';
  next.direction = 1;
  next.round += 1;
  next.roundResult = null;
  next.winnerId = null;
  next.winnerIds = [];
  for (const player of next.players) {
    player.toilette = false;
    player.celebration = false;
    if (!player.left) drawToLimit(next, player);
  }
  next.turnSeat = requester?.seat ?? activeRondaPlayers(next)[0]?.seat ?? null;
  if (requester && !requester.left) ensureStarterCanPlay(next, requester);
  next.version += 1;
  return ok({ state: next, events: [{ t: 'dealt', round: next.round }] });
}

export function applyRondaAction(
  state: RondaState,
  playerId: PlayerId,
  action: GameAction,
  _now: number,
): Result<{ state: RondaState; events: GameEvent[] }> {
  const player = rondaPlayer(state, playerId);
  if (!player || player.left) return err('PLAYER_NOT_IN_ROOM');
  if (action.type === 'nextRound') return nextRound(state);
  if (state.status !== 'playing') return err('INVALID_ACTION');

  if (action.type === 'playRondaCard') {
    if (state.phase !== 'ordering' || state.turnSeat !== player.seat) return err('NOT_YOUR_TURN');
    return playOrderingCard(state, player, action);
  }
  if (action.type === 'askRondaBill') return askBill(state, player);
  if (action.type === 'skipRondaTurn') {
    if (state.phase !== 'ordering' || state.turnSeat !== player.seat || !player.celebration) {
      return err('INVALID_ACTION');
    }
    const next = cloneState(state);
    advanceOrderingTurn(next, player.seat);
    next.version += 1;
    return ok({ state: next, events: [] });
  }
  if (action.type === 'chooseRondaBillMode') return chooseBillMode(state, player, action);
  if (action.type === 'playRondaTip') return playTip(state, player, action.cardId);
  if (action.type === 'passRondaBill') return passBill(state, player);
  if (action.type === 'confirmRondaDiscards') {
    return confirmDiscards(state, player, action.cardIds);
  }
  return err('INVALID_ACTION');
}

export { calculateRondaBill } from './rules.ts';
