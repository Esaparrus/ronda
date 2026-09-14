import type { RondaBillMode, RondaTapaType } from '@ronda/protocol';
import { rondaCardById } from './cards.ts';
import {
  RONDA_TAPA_TYPES,
  activeRondaPlayers,
  type RondaPlayer,
  type RondaState,
} from './state.ts';

export const WINE_GROUP_COSTS = [0, 3000, 6000, 12000, 18000] as const;

export function wineCostCents(count: number): number {
  return Math.floor(count / 5) * 24000 + (WINE_GROUP_COSTS[count % 5] ?? 0);
}

export function legalBlockTargets(state: RondaState): RondaTapaType[] {
  if (state.ordersClosed) return [];
  return RONDA_TAPA_TYPES.filter(
    (type) => state.tapas[type].length > 0 && !state.blockedTypes.includes(type),
  );
}

export function isOrderingCardLegal(
  state: RondaState,
  player: RondaPlayer,
  cardId: string,
): boolean {
  if (!player.hand.includes(cardId)) return false;
  const card = rondaCardById(cardId);
  if (!card) return false;

  if (card.kind === 'tapa') {
    if (state.ordersClosed || !card.tapaType || state.blockedTypes.includes(card.tapaType)) {
      return false;
    }
    const pile = state.tapas[card.tapaType];
    const top = pile[pile.length - 1];
    return !top || card.priceCents >= top.effectivePriceCents;
  }
  if (card.kind === 'vino') return !state.ordersClosed;
  if (card.kind === 'bloqueo') return legalBlockTargets(state).length > 0;
  if (card.kind === 'giro' || card.kind === 'celebracion') return !state.ordersClosed;
  if (card.kind === 'toilette') return true;
  if (card.kind === 'sobremesa') {
    return RONDA_TAPA_TYPES.every((type) => state.tapas[type].length > 0);
  }
  return false;
}

export function legalOrderingCardIds(state: RondaState, player: RondaPlayer): string[] {
  return player.hand.filter((cardId) => isOrderingCardLegal(state, player, cardId));
}

export function canAskRondaBill(state: RondaState, player: RondaPlayer): boolean {
  if (state.phase !== 'ordering' || state.turnSeat !== player.seat || player.celebration) {
    return false;
  }
  return (
    state.orderingCardCount >= activeRondaPlayers(state).length ||
    legalOrderingCardIds(state, player).length === 0
  );
}

export function cheapestEffectiveTapa(state: RondaState): number | null {
  const prices = RONDA_TAPA_TYPES.flatMap((type) =>
    state.tapas[type].map((tapa) => tapa.effectivePriceCents),
  );
  return prices.length > 0 ? Math.min(...prices) : null;
}

export function calculateRondaBill(state: RondaState): number {
  const tapas = RONDA_TAPA_TYPES.reduce(
    (sum, type) =>
      sum + state.tapas[type].reduce((typeSum, tapa) => typeSum + tapa.effectivePriceCents, 0),
    0,
  );
  const specials = state.publicSpecialCardIds.reduce(
    (sum, cardId) => sum + (rondaCardById(cardId)?.priceCents ?? 0),
    0,
  );
  const cheapest = cheapestEffectiveTapa(state) ?? 0;
  const tips = (state.bill?.tipCardIds.length ?? 0) * cheapest;
  return Math.max(0, tapas + wineCostCents(state.wineCardIds.length) + specials + tips);
}

export function availableBillTargets(state: RondaState, requester: RondaPlayer): RondaPlayer[] {
  return activeRondaPlayers(state).filter(
    (player) =>
      player.seat !== requester.seat && !player.toilette && !player.celebration,
  );
}

export function availableBillModes(
  state: RondaState,
  requester: RondaPlayer,
): RondaBillMode[] {
  const modes: RondaBillMode[] = ['solo'];
  const targets = availableBillTargets(state, requester);
  if (
    targets.length > 0 &&
    requester.hand.some((cardId) => rondaCardById(cardId)?.kind === 'mitad')
  ) {
    modes.push('half');
  }
  if (
    targets.length > 0 &&
    requester.hand.some((cardId) => rondaCardById(cardId)?.kind === 'grupo')
  ) {
    modes.push('group');
  }
  return modes;
}
