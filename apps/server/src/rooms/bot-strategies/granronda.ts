import type {
  GameAction,
  GranRondaEmbeddedGameAction,
  GranRondaPlayerView,
} from '@ronda/protocol';

/** Política sencilla: tira, toma la primera ruta y deja que la ficha avance. */
export function decideGranRondaAction(
  view: GranRondaPlayerView,
): Extract<
  GameAction,
  {
    type:
      | 'rollGranRonda'
      | 'advanceGranRondaMovement'
      | 'chooseGranRondaPath'
      | 'continueGranRondaResolution'
      | 'submitGranRondaMiniGameAction'
      | 'submitGranRondaAnswer'
      | 'finishGranRondaMiniGame'
      | 'nextRound';
  }
> | null {
  const actions = new Set(view.me.availableActions);
  if (actions.has('rollGranRonda')) return { type: 'rollGranRonda' };
  if (actions.has('advanceGranRondaMovement')) return { type: 'advanceGranRondaMovement' };
  if (actions.has('chooseGranRondaPath')) {
    const nextSpaceId = view.routeOptions[0];
    return nextSpaceId ? { type: 'chooseGranRondaPath', nextSpaceId } : null;
  }
  if (actions.has('continueGranRondaResolution')) return { type: 'continueGranRondaResolution' };
  if (actions.has('submitGranRondaMiniGameAction')) {
    const embedded = view.me.embeddedGame;
    if (!embedded) return null;
    if (embedded.gameId === 'sieteymedia') {
      const action: GranRondaEmbeddedGameAction = embedded.me.availableActions.includes('stand')
        ? { type: 'stand' }
        : { type: 'drawDeck' };
      return { type: 'submitGranRondaMiniGameAction', action };
    }
    if (embedded.gameId === 'cinquillo') {
      const cardId = embedded.me.legalCardIds[0];
      const action: GranRondaEmbeddedGameAction = cardId
        ? { type: 'playCard', cardId }
        : { type: 'pass' };
      return { type: 'submitGranRondaMiniGameAction', action };
    }
    const nestedActions = new Set(embedded.me.availableActions);
    let action: GranRondaEmbeddedGameAction | null = null;
    if (nestedActions.has('musicSelectTrack')) {
      action = {
        type: 'musicSelectTrack',
        track: {
          id: `granronda-bot-track-${view.round}`,
          title: `Canción de la ronda ${view.round}`,
          artist: 'La Gran Ronda',
          year: 2020,
          previewUrl: `https://example.com/granronda-bot-${view.round}.mp3`,
          artworkUrl: null,
          storeUrl: 'https://example.com',
        },
      };
    } else if (nestedActions.has('musicStartClip')) action = { type: 'musicStartClip' };
    else if (nestedActions.has('musicBuzz')) action = { type: 'musicBuzz' };
    else if (nestedActions.has('musicSubmitGuess')) {
      action = { type: 'musicSubmitGuess', artist: 'Bot', title: 'Respuesta', year: null };
    } else if (nestedActions.has('musicNextClip')) action = { type: 'musicNextClip' };
    else if (nestedActions.has('musicNextRound')) action = { type: 'musicNextRound' };
    return action ? { type: 'submitGranRondaMiniGameAction', action } : null;
  }
  if (actions.has('submitGranRondaAnswer')) {
    const optionId = view.miniGame.options[0]?.id;
    return optionId ? { type: 'submitGranRondaAnswer', optionId } : null;
  }
  if (actions.has('finishGranRondaMiniGame')) return { type: 'finishGranRondaMiniGame' };
  if (actions.has('nextRound')) return { type: 'nextRound' };
  return null;
}
