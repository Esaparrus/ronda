import type { GameAction, GranRondaPlayerView } from '@ronda/protocol';

/** Política sencilla: mueve, toma la primera ruta y responde la primera opción. */
export function decideGranRondaAction(
  view: GranRondaPlayerView,
): Extract<
  GameAction,
  {
    type:
      | 'rollGranRonda'
      | 'chooseGranRondaPath'
      | 'submitGranRondaAnswer'
      | 'finishGranRondaMiniGame'
      | 'nextRound';
  }
> | null {
  const actions = new Set(view.me.availableActions);
  if (actions.has('rollGranRonda')) return { type: 'rollGranRonda' };
  if (actions.has('chooseGranRondaPath')) {
    const nextSpaceId = view.routeOptions[0];
    return nextSpaceId ? { type: 'chooseGranRondaPath', nextSpaceId } : null;
  }
  if (actions.has('submitGranRondaAnswer')) {
    const optionId = view.miniGame.options[0]?.id;
    return optionId ? { type: 'submitGranRondaAnswer', optionId } : null;
  }
  if (actions.has('finishGranRondaMiniGame')) return { type: 'finishGranRondaMiniGame' };
  if (actions.has('nextRound')) return { type: 'nextRound' };
  return null;
}
