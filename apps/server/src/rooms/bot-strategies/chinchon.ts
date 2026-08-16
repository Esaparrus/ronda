import { solveHand } from '@ronda/engine';
import type { CardId, ChinchonPlayerView, GameAction } from '@ronda/protocol';
import { botCard, cardsNotKnown, chooseNearBest } from './shared.ts';

interface DiscardChoice {
  cardId: CardId;
  hand: CardId[];
  deadwood: number;
  meldedCards: number;
  score: number;
}

function immediateHandScore(hand: CardId[]): Omit<DiscardChoice, 'cardId' | 'hand'> {
  const solution = solveHand(hand);
  const meldedCards = solution.melds.reduce((total, meld) => total + meld.length, 0);
  const highLooseCards = solution.leftovers.reduce((total, cardId) => {
    const card = botCard(cardId);
    return total + (card?.points ?? 0) ** 1.25;
  }, 0);
  return {
    deadwood: solution.deadwood,
    meldedCards,
    score: solution.deadwood * 100 + highLooseCards - meldedCards * 1.5,
  };
}

function rankedDiscards(hand: readonly CardId[], lockedCardId: CardId | null): DiscardChoice[] {
  return hand
    .filter((cardId) => cardId !== lockedCardId)
    .map((cardId) => {
      const remaining = hand.filter((candidate) => candidate !== cardId);
      const evaluation = immediateHandScore(remaining);
      return { cardId, hand: remaining, ...evaluation };
    })
    .sort(
      (a, b) =>
        a.score - b.score ||
        b.meldedCards - a.meldedCards ||
        (botCard(b.cardId)?.points ?? 0) - (botCard(a.cardId)?.points ?? 0) ||
        a.cardId.localeCompare(b.cardId),
    );
}

function knownCards(view: ChinchonPlayerView): Set<CardId> {
  return new Set<CardId>([...view.me.hand, ...view.discardCards]);
}

/** Valor esperado al robar una carta desconocida y hacer el mejor descarte. */
function expectedDeckScore(view: ChinchonPlayerView): number {
  const unknown = cardsNotKnown(knownCards(view));
  if (unknown.length === 0) return Number.POSITIVE_INFINITY;
  let total = 0;
  for (const drawn of unknown) {
    total += rankedDiscards([...view.me.hand, drawn], null)[0]?.score ?? 10_000;
  }
  return total / unknown.length;
}

/**
 * Premia manos con muchas cartas desconocidas que, en el próximo robo,
 * reducen de verdad los puntos sueltos. Solo se usa al desempatar descartes:
 * la prioridad principal sigue siendo el deadwood actual.
 */
function futurePotential(view: ChinchonPlayerView, choice: DiscardChoice): number {
  const known = knownCards(view);
  for (const cardId of choice.hand) known.add(cardId);
  const unknown = cardsNotKnown(known);
  let improvement = 0;
  let closingOuts = 0;
  for (const drawn of unknown) {
    const next = rankedDiscards([...choice.hand, drawn], null)[0];
    if (!next) continue;
    improvement += Math.max(0, choice.deadwood - next.deadwood);
    if (next.deadwood <= view.config.closeThreshold) closingOuts += 1;
  }
  return improvement + closingOuts * 0.35;
}

function chooseDiscard(view: ChinchonPlayerView): CardId | null {
  const ranked = rankedDiscards(view.me.hand, view.me.lockedCardId).map((choice) => ({
    value: choice.cardId,
    score: choice.score - futurePotential(view, choice) * 2.4,
  }));
  ranked.sort((a, b) => a.score - b.score || a.value.localeCompare(b.value));
  return chooseNearBest(ranked, `${view.roomCode}:${view.round}:${view.me.hand.join(',')}`, 2.25);
}

function chooseClosingDiscard(view: ChinchonPlayerView): DiscardChoice | null {
  const allowed = new Set(view.me.closableDiscards);
  return (
    rankedDiscards(view.me.hand, view.me.lockedCardId).find((choice) =>
      allowed.has(choice.cardId),
    ) ?? null
  );
}

function shouldClose(view: ChinchonPlayerView, closing: DiscardChoice): boolean {
  // Con 0-5 puntos cerrar es casi siempre correcto. En la variante permisiva
  // de 10, una mano de 6-10 sigue jugando salvo que el mazo o el tanteo apriete.
  if (closing.deadwood <= 5 || view.config.closeThreshold <= 5) return true;
  if (view.deckCount <= Math.max(5, view.players.length * 2)) return true;

  const me = view.players.find((player) => player.playerId === view.me.playerId);
  const opponents = view.players.filter(
    (player) => player.playerId !== view.me.playerId && !player.eliminated,
  );
  const opponentNearElimination = opponents.some(
    (player) => player.score + 15 > view.config.eliminationScore,
  );
  const iAmInDanger = (me?.score ?? 0) + closing.deadwood + 10 > view.config.eliminationScore;
  return opponentNearElimination || iAmInDanger;
}

export function decideChinchonAction(view: ChinchonPlayerView): GameAction | null {
  const actions = new Set(view.me.availableActions);

  if (actions.has('drawDeck')) {
    if (!actions.has('drawDiscard') || !view.discardTop) return { type: 'drawDeck' };
    const discardResult = rankedDiscards(
      [...view.me.hand, view.discardTop],
      view.config.forbidDiscardDrawnCard ? view.discardTop : null,
    )[0];
    if (!discardResult) return { type: 'drawDeck' };

    const deckScore = expectedDeckScore(view);
    const knownCardAdvantage = discardResult.score <= deckScore - 4;
    const createsClose = discardResult.deadwood <= view.config.closeThreshold;
    return knownCardAdvantage || createsClose ? { type: 'drawDiscard' } : { type: 'drawDeck' };
  }

  if (actions.has('close')) {
    const closing = chooseClosingDiscard(view);
    if (closing && shouldClose(view, closing)) return { type: 'close', cardId: closing.cardId };
  }

  if (actions.has('discard')) {
    const cardId = chooseDiscard(view);
    return cardId ? { type: 'discard', cardId } : null;
  }
  return null;
}

/** Descarte automático al agotarse el tiempo; nunca intenta cerrar. */
export function decideChinchonTimeoutDiscard(view: ChinchonPlayerView): GameAction | null {
  if (!view.me.availableActions.includes('discard')) return null;
  const cardId = chooseDiscard(view);
  return cardId ? { type: 'discard', cardId } : null;
}
