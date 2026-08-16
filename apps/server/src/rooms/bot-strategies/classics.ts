import { cinquilloLegal, escobaValue, fuerza, trickPoints } from '@ronda/engine';
import type { CardId, ClassicPlayerView, GameAction, Suit } from '@ronda/protocol';
import { botCard, cardsNotKnown, chooseNearBest } from './shared.ts';

function trickClass(view: ClassicPlayerView, cardId: CardId, leadSuit: Suit): number {
  const card = botCard(cardId);
  if (!card) return 0;
  if (view.trumpSuit !== null && card.suit === view.trumpSuit) return 2;
  return card.suit === leadSuit ? 1 : 0;
}

function compareTrickCards(view: ClassicPlayerView, a: CardId, b: CardId, leadSuit: Suit): number {
  const category = trickClass(view, a, leadSuit) - trickClass(view, b, leadSuit);
  if (category !== 0) return category;
  if (trickClass(view, a, leadSuit) === 0) return 0;
  const ca = botCard(a);
  const cb = botCard(b);
  if (!ca || !cb) return 0;
  return fuerza(ca.rank, 'brisca') - fuerza(cb.rank, 'brisca');
}

function partialWinner(view: ClassicPlayerView, cards: readonly CardId[]): CardId | null {
  const first = cards[0];
  const lead = first ? botCard(first)?.suit : null;
  if (!first || !lead) return null;
  return cards
    .slice(1)
    .reduce(
      (winner, cardId) => (compareTrickCards(view, cardId, winner, lead) > 0 ? cardId : winner),
      first,
    );
}

function trickResourceCost(view: ClassicPlayerView, cardId: CardId): number {
  const card = botCard(cardId);
  if (!card) return 0;
  const strength = fuerza(card.rank, 'brisca');
  const trump = view.trumpSuit !== null && card.suit === view.trumpSuit ? 14 : 0;
  const points = trickPoints(cardId) * 2;
  let song = 0;
  if (
    view.gameId === 'tute' &&
    (card.rank === 11 || card.rank === 12) &&
    view.me.hand.includes(`${card.suit}-${card.rank === 11 ? 12 : 11}`)
  ) {
    song = card.suit === view.trumpSuit ? 45 : 24;
  }
  return strength + trump + points + song;
}

function chooseTrickCard(view: ClassicPlayerView): CardId | null {
  const legal = view.me.legalCardIds;
  if (legal.length === 0) return null;
  const before = view.currentTrick.map((played) => played.cardId);
  const activePlayers = view.players.filter((player) => !player.eliminated).length;
  const isLast = before.length === activePlayers - 1;

  if (before.length > 0) {
    const trickValue = before.reduce((total, cardId) => total + trickPoints(cardId), 0);
    const winning = legal.filter((cardId) => partialWinner(view, [...before, cardId]) === cardId);
    const worthTaking = isLast || trickValue >= 8 || view.deckCount === 0;
    if (winning.length > 0 && worthTaking) {
      const ranked = winning
        .map((cardId) => ({ value: cardId, score: trickResourceCost(view, cardId) }))
        .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));
      return chooseNearBest(
        ranked,
        `${view.roomCode}:${view.round}:capture:${before.join(',')}`,
        1,
      );
    }

    const losing = legal.filter((cardId) => partialWinner(view, [...before, cardId]) !== cardId);
    const pool = losing.length > 0 ? losing : winning;
    const ranked = pool
      .map((cardId) => ({
        value: cardId,
        // No regala tantos y conserva triunfo, ases, treses y cantes.
        score: trickPoints(cardId) * 12 + trickResourceCost(view, cardId),
      }))
      .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));
    return chooseNearBest(ranked, `${view.roomCode}:${view.round}:duck:${before.join(',')}`, 1);
  }

  const hasSong =
    view.gameId === 'tute' &&
    view.me.hand.some((cardId) => {
      const card = botCard(cardId);
      return card?.rank === 11 && view.me.hand.includes(`${card.suit}-12`);
    });
  const attacking = legal.filter((cardId) => {
    const card = botCard(cardId);
    if (!card) return false;
    const strength = fuerza(card.rank, 'brisca');
    return strength >= 9 || (hasSong && strength >= 8);
  });
  if (attacking.length > 0) {
    const ranked = attacking
      .map((cardId) => ({
        value: cardId,
        score:
          -fuerza(botCard(cardId)?.rank ?? 2, 'brisca') + trickResourceCost(view, cardId) * 0.08,
      }))
      .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));
    return ranked[0]?.value ?? null;
  }

  const ranked = legal
    .map((cardId) => ({ value: cardId, score: trickResourceCost(view, cardId) }))
    .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));
  return chooseNearBest(ranked, `${view.roomCode}:${view.round}:lead:${legal.join(',')}`, 1);
}

function captureCombinations(table: readonly CardId[], target: number): CardId[][] {
  const result: CardId[][] = [];
  function visit(index: number, remaining: number, selected: CardId[]): void {
    if (remaining === 0) {
      result.push([...selected]);
      return;
    }
    if (remaining < 0) return;
    for (let cursor = index; cursor < table.length; cursor += 1) {
      const cardId = table[cursor];
      if (!cardId) continue;
      const value = escobaValue(cardId);
      if (value > remaining) continue;
      selected.push(cardId);
      visit(cursor + 1, remaining - value, selected);
      selected.pop();
    }
  }
  visit(0, target, []);
  return result;
}

function escobaCaptureValue(captured: readonly CardId[], clearsTable: boolean): number {
  let score = captured.length * 3;
  for (const cardId of captured) {
    const card = botCard(cardId);
    if (!card) continue;
    if (card.suit === 'oros') score += 2.5;
    if (card.rank === 7) score += 4;
    if (cardId === 'oros-7') score += 14;
  }
  if (clearsTable) score += 28;
  return score;
}

function tableThreat(table: readonly CardId[]): number {
  let threat = 0;
  for (let playValue = 1; playValue <= 10; playValue += 1) {
    const captures = captureCombinations(table, 15 - playValue);
    const best = captures.reduce(
      (maximum, capture) =>
        Math.max(maximum, escobaCaptureValue(capture, capture.length === table.length)),
      0,
    );
    threat += best;
  }
  return threat;
}

function chooseEscobaPlay(
  view: ClassicPlayerView,
): Extract<GameAction, { type: 'playCapture' }> | null {
  const captures = view.me.hand.flatMap((cardId) => {
    const target = 15 - escobaValue(cardId);
    return captureCombinations(view.tableCards, target).map((captureIds) => ({
      cardId,
      captureIds,
      score: escobaCaptureValue(
        [cardId, ...captureIds],
        captureIds.length === view.tableCards.length,
      ),
    }));
  });
  if (captures.length > 0) {
    captures.sort((a, b) => b.score - a.score || a.cardId.localeCompare(b.cardId));
    const best = captures[0];
    return best ? { type: 'playCapture', cardId: best.cardId, captureIds: best.captureIds } : null;
  }

  const ranked = view.me.hand
    .map((cardId) => {
      const card = botCard(cardId);
      const strategicLoss =
        (card?.suit === 'oros' ? 5 : 0) +
        (card?.rank === 7 ? 8 : 0) +
        (cardId === 'oros-7' ? 20 : 0);
      return {
        value: cardId,
        score: tableThreat([...view.tableCards, cardId]) + strategicLoss,
      };
    })
    .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));
  const cardId = chooseNearBest(
    ranked,
    `${view.roomCode}:${view.round}:escoba:${view.tableCards.join(',')}`,
    1.5,
  );
  return cardId ? { type: 'playCapture', cardId, captureIds: [] } : null;
}

function bustProbability(view: ClassicPlayerView, total: number): number {
  const known = new Set<CardId>(view.me.hand);
  for (const revealed of view.revealedHands) {
    for (const cardId of revealed.cards) known.add(cardId);
  }
  const unknown = cardsNotKnown(known);
  if (unknown.length === 0) return 1;
  const busts = unknown.filter((cardId) => {
    const card = botCard(cardId);
    const value = card ? (card.rank <= 7 ? card.rank : 0.5) : 0;
    return total + value > 7.5;
  }).length;
  return busts / unknown.length;
}

function decideSevenHalf(view: ClassicPlayerView): GameAction {
  const total = view.me.total ?? 0;
  if (total >= 7.5) return { type: 'stand' };
  const meIsBanker = view.bankerPlayerId === view.me.playerId;
  if (meIsBanker) {
    const target = view.totals.reduce<number>((maximum, candidate, seat) => {
      const player = view.players[seat];
      if (
        !player ||
        player.playerId === view.me.playerId ||
        candidate === null ||
        candidate > 7.5
      ) {
        return maximum;
      }
      return Math.max(maximum, candidate);
    }, 0);
    return total >= target ? { type: 'stand' } : { type: 'drawDeck' };
  }

  const risk = bustProbability(view, total);
  const acceptableRisk =
    total <= 4.5 ? 1 : total === 5 ? 0.58 : total === 5.5 ? 0.38 : total === 6 ? 0.2 : 0.08;
  return risk <= acceptableRisk ? { type: 'drawDeck' } : { type: 'stand' };
}

function cinquilloChainLength(hand: readonly CardId[], table: readonly CardId[]): number {
  const remaining = [...hand];
  const layout = [...table];
  let count = 0;
  while (true) {
    const legal = cinquilloLegal(remaining, layout);
    const next =
      legal.find((cardId) => {
        const candidateTable = [...layout, cardId];
        const rest = remaining.filter((candidate) => candidate !== cardId);
        return cinquilloLegal(rest, candidateTable).length > 0;
      }) ?? legal[0];
    if (!next) break;
    count += 1;
    layout.push(next);
    remaining.splice(remaining.indexOf(next), 1);
  }
  return count;
}

function chooseCinquilloCard(view: ClassicPlayerView): CardId | null {
  const ranked = view.me.legalCardIds
    .map((cardId) => {
      const remaining = view.me.hand.filter((candidate) => candidate !== cardId);
      const table = [...view.tableCards, cardId];
      const immediate = cinquilloLegal(remaining, table).length;
      const chain = cinquilloChainLength(remaining, table);
      const card = botCard(cardId);
      const opensSuit = card?.rank === 5 && cardId !== 'oros-5';
      return {
        value: cardId,
        score: (opensSuit ? 7 : 0) - immediate * 5 - chain * 1.5,
      };
    })
    .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));
  return chooseNearBest(
    ranked,
    `${view.roomCode}:${view.round}:cinquillo:${view.tableCards.join(',')}`,
    0.75,
  );
}

export function decideClassicAction(view: ClassicPlayerView): GameAction | null {
  const actions = new Set(view.me.availableActions);
  if (view.gameId === 'sieteymedia' && (actions.has('drawDeck') || actions.has('stand'))) {
    return decideSevenHalf(view);
  }
  if (view.gameId === 'escoba' && actions.has('playCapture')) return chooseEscobaPlay(view);
  if (view.gameId === 'cinquillo') {
    if (actions.has('pass')) return { type: 'pass' };
    if (actions.has('playCard')) {
      const cardId = chooseCinquilloCard(view);
      return cardId ? { type: 'playCard', cardId } : null;
    }
  }
  if ((view.gameId === 'brisca' || view.gameId === 'tute') && actions.has('playCard')) {
    const cardId = chooseTrickCard(view);
    return cardId ? { type: 'playCard', cardId } : null;
  }
  return null;
}
