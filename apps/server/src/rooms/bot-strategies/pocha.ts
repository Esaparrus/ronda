import { fuerza, POCHA_RANKS } from '@ronda/engine';
import type { CardId, GameAction, PochaPlayerView, Suit } from '@ronda/protocol';
import { botCard, cardsNotKnown, chooseNearBest } from './shared.ts';

function mySeat(view: PochaPlayerView): number | null {
  return view.players.find((player) => player.playerId === view.me.playerId)?.seat ?? null;
}

function rankIndex(view: PochaPlayerView, cardId: CardId): number {
  const card = botCard(cardId);
  if (!card) return 0;
  const ordered = [...POCHA_RANKS].sort(
    (a, b) => fuerza(a, view.config.rankOrder) - fuerza(b, view.config.rankOrder),
  );
  return Math.max(0, ordered.indexOf(card.rank)) + 1;
}

function sampleWithoutHigher(totalUnknown: number, higher: number, cardsHeld: number): number {
  if (higher <= 0 || cardsHeld <= 0) return 1;
  let probability = 1;
  for (let index = 0; index < Math.min(cardsHeld, totalUnknown); index += 1) {
    probability *= Math.max(0, totalUnknown - higher - index) / Math.max(1, totalUnknown - index);
  }
  return probability;
}

function estimatedCardWinProbability(view: PochaPlayerView, cardId: CardId): number {
  const card = botCard(cardId);
  if (!card) return 0;
  const known = new Set<CardId>([...view.me.hand]);
  if (view.trumpCardId) known.add(view.trumpCardId);
  for (const played of view.currentTrick) known.add(played.cardId);
  const unknown = cardsNotKnown(known);
  const higherSameSuit = unknown.filter((candidate) => {
    const other = botCard(candidate);
    return (
      other?.suit === card.suit &&
      fuerza(other.rank, view.config.rankOrder) > fuerza(card.rank, view.config.rankOrder)
    );
  }).length;
  const opponents = Math.max(1, view.players.filter((player) => !player.eliminated).length - 1);
  const opponentCards = Math.min(unknown.length, opponents * view.roundSize);
  const noHigher = sampleWithoutHigher(unknown.length, higherSameSuit, opponentCards);
  const suitLength = view.me.hand.filter(
    (candidate) => botCard(candidate)?.suit === card.suit,
  ).length;

  if (view.trumpSuit !== null && card.suit === view.trumpSuit) {
    return Math.min(0.98, noHigher * (0.78 + suitLength * 0.04));
  }

  const unseenTrumps =
    view.trumpSuit === null
      ? 0
      : unknown.filter((candidate) => botCard(candidate)?.suit === view.trumpSuit).length;
  const trumpRisk =
    view.trumpSuit === null
      ? 1
      : sampleWithoutHigher(unknown.length, unseenTrumps, Math.max(1, opponents));
  const leadControl = Math.min(0.93, 0.42 + suitLength * 0.12 + rankIndex(view, cardId) * 0.025);
  return noHigher * (0.55 + trumpRisk * 0.45) * leadControl;
}

function legalBid(view: PochaPlayerView, proposed: number, seat: number | null): number {
  let amount = Math.min(view.roundSize, Math.max(0, Math.round(proposed)));
  if (seat === null || seat !== view.dealerSeat) return amount;
  const sumOthers = view.bids.reduce<number>(
    (total, bid, bidSeat) => total + (bidSeat === seat ? 0 : (bid ?? 0)),
    0,
  );
  const forbidden = view.roundSize - sumOthers;
  if (amount === forbidden) {
    const up = amount + 1;
    const down = amount - 1;
    amount = up <= view.roundSize ? up : Math.max(0, down);
  }
  return amount;
}

function decideBid(view: PochaPlayerView, seat: number | null): number {
  const probabilities = view.me.hand.map((cardId) => estimatedCardWinProbability(view, cardId));
  const expected = probabilities.reduce((sum, probability) => sum + probability, 0);
  const nearCertain = probabilities.filter((probability) => probability >= 0.82).length;
  // Ligero sesgo conservador: fallar por una baza puntúa igual que fallar por
  // varias, y las cartas ganadoras se estorban entre sí en una misma mano.
  const calibrated = Math.max(nearCertain, expected * 0.9);
  return legalBid(view, calibrated, seat);
}

function cardClass(view: PochaPlayerView, cardId: CardId, leadSuit: Suit): number {
  const card = botCard(cardId);
  if (!card) return 0;
  if (view.trumpSuit !== null && card.suit === view.trumpSuit) return 2;
  if (card.suit === leadSuit) return 1;
  return 0;
}

function compareInTrick(view: PochaPlayerView, a: CardId, b: CardId, leadSuit: Suit): number {
  const classDiff = cardClass(view, a, leadSuit) - cardClass(view, b, leadSuit);
  if (classDiff !== 0) return classDiff;
  if (cardClass(view, a, leadSuit) === 0) return 0;
  const ca = botCard(a);
  const cb = botCard(b);
  if (!ca || !cb) return 0;
  return fuerza(ca.rank, view.config.rankOrder) - fuerza(cb.rank, view.config.rankOrder);
}

function currentWinner(view: PochaPlayerView, cards: readonly CardId[]): CardId | null {
  const first = cards[0];
  const leadSuit = view.leadSuit ?? (first ? botCard(first)?.suit : null);
  if (!first || !leadSuit) return null;
  return cards
    .slice(1)
    .reduce(
      (winner, cardId) => (compareInTrick(view, cardId, winner, leadSuit) > 0 ? cardId : winner),
      first,
    );
}

function resourceCost(view: PochaPlayerView, cardId: CardId): number {
  const card = botCard(cardId);
  if (!card) return 0;
  return (
    rankIndex(view, cardId) + (view.trumpSuit !== null && card.suit === view.trumpSuit ? 12 : 0)
  );
}

function chanceCandidateSurvives(view: PochaPlayerView, cardId: CardId): number {
  const played = [...view.currentTrick.map((card) => card.cardId), cardId];
  const winner = currentWinner(view, played);
  if (winner !== cardId) return 0;
  const laterPlayers = Math.max(0, view.players.length - played.length);
  if (laterPlayers === 0) return 1;
  const lead = view.leadSuit ?? botCard(played[0] ?? cardId)?.suit;
  if (!lead) return 0;
  const known = new Set<CardId>([...view.me.hand, ...played]);
  if (view.trumpCardId) known.add(view.trumpCardId);
  const unknown = cardsNotKnown(known);
  const beaters = unknown.filter(
    (candidate) => compareInTrick(view, candidate, cardId, lead) > 0,
  ).length;
  return sampleWithoutHigher(unknown.length, beaters, laterPlayers);
}

function chooseCard(view: PochaPlayerView, seat: number | null): CardId | null {
  const legal = view.me.legalCardIds;
  if (legal.length === 0) return null;
  const bid = seat === null ? 0 : (view.bids[seat] ?? 0);
  const won = seat === null ? 0 : (view.tricksWon[seat] ?? 0);
  const wantsWin = won < bid;
  const cardsBefore = view.currentTrick.map((card) => card.cardId);

  if (wantsWin) {
    const ranked = legal
      .map((cardId) => {
        const survives = chanceCandidateSurvives(view, cardId);
        const cost = resourceCost(view, cardId);
        return {
          value: cardId,
          // Primero probabilidad de ganar; entre cartas igualmente seguras,
          // gasta la más barata.
          score: (1 - survives) * 100 + cost,
        };
      })
      .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));
    return chooseNearBest(
      ranked,
      `${view.roomCode}:${view.round}:win:${view.currentTrick.length}:${legal.join(',')}`,
      1.25,
    );
  }

  const rankedToLose = legal
    .map((cardId) => {
      const winner = currentWinner(view, [...cardsBefore, cardId]);
      const winsNow = winner === cardId;
      const survives = winsNow ? chanceCandidateSurvives(view, cardId) : 0;
      // Si ya se cumplió el cante, se desprende primero de cartas peligrosas
      // siempre que no se lleven la baza actual.
      return {
        value: cardId,
        score: survives * 100 - resourceCost(view, cardId),
      };
    })
    .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));
  return chooseNearBest(
    rankedToLose,
    `${view.roomCode}:${view.round}:lose:${view.currentTrick.length}:${legal.join(',')}`,
    1.25,
  );
}

export function decidePochaAction(view: PochaPlayerView): GameAction | null {
  const actions = new Set(view.me.availableActions);
  const seat = mySeat(view);
  if (actions.has('bid')) return { type: 'bid', amount: decideBid(view, seat) };
  if (actions.has('playCard')) {
    const cardId = chooseCard(view, seat);
    return cardId ? { type: 'playCard', cardId } : null;
  }
  return null;
}
