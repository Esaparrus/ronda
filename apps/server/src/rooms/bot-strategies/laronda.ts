import type { GameAction, RondaCardView, RondaPlayerView, RondaTapaType } from '@ronda/protocol';
import { chooseNearBest } from './shared.ts';

function myPublicPlayer(view: RondaPlayerView) {
  return view.players.find((player) => player.playerId === view.me.playerId) ?? null;
}

function cardUtility(card: RondaCardView): number {
  switch (card.kind) {
    case 'grupo':
      return 100;
    case 'mitad':
      return 82;
    case 'celebracion':
      return 78;
    case 'toilette':
      return 68;
    case 'servicio':
      return 58;
    case 'sobremesa':
      return 48;
    case 'bloqueo':
      return 38;
    case 'premium':
      return 32;
    case 'giro':
      return 18;
    case 'tapa':
      return 10 + card.priceCents / 1_000;
    case 'vino':
      return 14;
  }
}

function shouldAskBill(view: RondaPlayerView): boolean {
  const actions = new Set(view.me.availableActions);
  if (!actions.has('askRondaBill')) return false;
  const legal = view.me.legalCardIds;
  if (legal.length === 0) return !actions.has('skipRondaTurn');
  const me = myPublicPlayer(view);
  const balance = Math.max(1, me?.score ?? 1);
  const hasSplit = view.me.hand.some((card) => card.kind === 'grupo' || card.kind === 'mitad');
  const iAmLeading = view.players.every(
    (player) => player.playerId === view.me.playerId || (me?.score ?? 0) >= player.score,
  );
  return view.billPreviewCents <= balance * 0.14 || (hasSplit && iAmLeading);
}

function bestBlockTarget(view: RondaPlayerView): RondaTapaType | undefined {
  const legal = new Set(view.me.legalTargetTypes);
  return [...view.tapas]
    .filter((pile) => legal.has(pile.type))
    .sort((a, b) => (b.topPriceCents ?? 0) - (a.topPriceCents ?? 0))[0]?.type;
}

function chooseOrderingCard(view: RondaPlayerView): GameAction | null {
  const legal = new Set(view.me.legalCardIds);
  const premium = view.me.hand.find((card) => card.kind === 'premium');
  const ranked = view.me.hand
    .filter((card) => legal.has(card.id))
    .map((card) => {
      let score = 0;
      switch (card.kind) {
        case 'celebracion':
          score = -95;
          break;
        case 'toilette':
          score = -75;
          break;
        case 'sobremesa':
          // Cierra la cocina y fuerza al siguiente jugador a afrontar la cuenta.
          score = -68 - view.billPreviewCents / 2_500;
          break;
        case 'bloqueo':
          score = -42;
          break;
        case 'tapa':
          // Cuando no conviene pedir cuenta, aumentar el coste presiona a quien
          // la pida después. Las tapas altas ganan prioridad.
          score = -card.priceCents / 900;
          break;
        case 'vino':
          score = -24 - (view.wineCount % 5 === 4 ? 24 : 0);
          break;
        case 'giro':
          score = -12;
          break;
        default:
          score = 20;
      }
      return { value: card, score };
    })
    .sort((a, b) => a.score - b.score || a.value.id.localeCompare(b.value.id));
  const card = chooseNearBest(
    ranked,
    `${view.roomCode}:${view.round}:ronda:${view.me.hand.map((item) => item.id).join(',')}`,
    1,
  );
  if (!card) return null;

  const action: Extract<GameAction, { type: 'playRondaCard' }> = {
    type: 'playRondaCard',
    cardId: card.id,
  };
  if (card.kind === 'bloqueo') action.targetType = bestBlockTarget(view);
  if (card.kind === 'tapa' && premium && card.priceCents >= 4_000) {
    action.premiumCardId = premium.id;
  }
  return action;
}

function chooseBillMode(view: RondaPlayerView): GameAction | null {
  const modes = new Set(view.me.availableBillModes);
  const group = view.me.hand.find((card) => card.kind === 'grupo');
  if (modes.has('group') && group) {
    return { type: 'chooseRondaBillMode', mode: 'group', cardId: group.id };
  }

  const half = view.me.hand.find((card) => card.kind === 'mitad');
  if (modes.has('half') && half) {
    const me = myPublicPlayer(view);
    const targets = view.players.filter((player) =>
      view.me.legalTargetPlayerIds.includes(player.playerId),
    );
    const leader = [...targets].sort((a, b) => b.score - a.score)[0];
    const weakest = [...targets].sort((a, b) => a.score - b.score)[0];
    const target = leader && leader.score > (me?.score ?? 0) ? leader : weakest;
    if (target) {
      return {
        type: 'chooseRondaBillMode',
        mode: 'half',
        cardId: half.id,
        targetPlayerId: target.playerId,
      };
    }
  }
  return modes.has('solo') ? { type: 'chooseRondaBillMode', mode: 'solo' } : null;
}

function shouldAddTip(view: RondaPlayerView): boolean {
  const requester = view.players.find((player) => player.playerId === view.billRequesterId);
  const me = myPublicPlayer(view);
  if (!requester || requester.playerId === view.me.playerId) return false;
  if (view.billMode === 'solo' || view.billMode === 'half') return true;
  return requester.score > (me?.score ?? 0) && view.billPreviewCents < (me?.score ?? 0) * 0.65;
}

function discardForRefresh(view: RondaPlayerView): string[] {
  const ordered = [...view.me.hand].sort(
    (a, b) => cardUtility(b) - cardUtility(a) || a.id.localeCompare(b.id),
  );
  const keepCount = Math.min(3, Math.max(1, ordered.length - 1));
  const keep = new Set(ordered.slice(0, keepCount).map((card) => card.id));
  return ordered.filter((card) => !keep.has(card.id)).map((card) => card.id);
}

export function decideRondaAction(view: RondaPlayerView): GameAction | null {
  const actions = new Set(view.me.availableActions);
  if (actions.has('nextRound')) return { type: 'nextRound' };

  if (view.phase === 'ordering') {
    if (actions.has('skipRondaTurn') && view.billPreviewCents > 0) return { type: 'skipRondaTurn' };
    if (shouldAskBill(view)) return { type: 'askRondaBill' };
    if (actions.has('playRondaCard')) return chooseOrderingCard(view);
    if (actions.has('askRondaBill')) return { type: 'askRondaBill' };
    if (actions.has('skipRondaTurn')) return { type: 'skipRondaTurn' };
  }

  if (actions.has('chooseRondaBillMode')) return chooseBillMode(view);
  if (actions.has('playRondaTip') && shouldAddTip(view)) {
    const service = view.me.hand.find((card) => card.kind === 'servicio');
    if (service) return { type: 'playRondaTip', cardId: service.id };
  }
  if (actions.has('passRondaBill')) return { type: 'passRondaBill' };
  if (actions.has('confirmRondaDiscards')) {
    return { type: 'confirmRondaDiscards', cardIds: discardForRefresh(view) };
  }
  return null;
}
