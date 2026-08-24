import type {
  ChinchonPlayerView,
  ClassicPlayerView,
  GameAction,
  GranRondaEmbeddedGameAction,
  GranRondaPlayerView,
  PochaPlayerView,
  PartyPlayerView,
  PrecioJustoPlayerView,
  RoadmapPlayerView,
  RondaPlayerView,
} from '@ronda/protocol';
import { decideChinchonAction } from './chinchon.ts';
import { decideClassicAction } from './classics.ts';
import { decidePochaAction } from './pocha.ts';
import { decidePartyAction } from './party.ts';
import { decidePrecioJustoAction } from './preciojusto.ts';
import { decideRoadmapAction } from './roadmap.ts';
import { decideRondaAction } from './laronda.ts';

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
    let action: GranRondaEmbeddedGameAction | null = null;
    if (embedded.gameId === 'chinchon') {
      const nestedAction = decideChinchonAction(embedded as ChinchonPlayerView);
      if (nestedAction) action = nestedAction as GranRondaEmbeddedGameAction;
    } else if (embedded.gameId === 'pocha') {
      const nestedAction = decidePochaAction(embedded as PochaPlayerView);
      if (nestedAction) action = nestedAction as GranRondaEmbeddedGameAction;
    } else if (embedded.gameId === 'laronda') {
      const nestedAction = decideRondaAction(embedded as RondaPlayerView);
      if (nestedAction && nestedAction.type !== 'nextRound') {
        action = nestedAction as GranRondaEmbeddedGameAction;
      }
    } else if (embedded.gameId === 'preciojusto') {
      const nestedAction = decidePrecioJustoAction(embedded as PrecioJustoPlayerView);
      if (nestedAction) action = nestedAction as GranRondaEmbeddedGameAction;
    } else if (
      embedded.gameId === 'banderas' ||
      embedded.gameId === 'cifras' ||
      embedded.gameId === 'quienloharia' ||
      embedded.gameId === 'completalafrase'
    ) {
      const nestedAction = decideRoadmapAction(embedded as RoadmapPlayerView);
      if (nestedAction && nestedAction.type !== 'nextRound') {
        action = nestedAction as GranRondaEmbeddedGameAction;
      }
    } else if (
      embedded.gameId === 'brisca' ||
      embedded.gameId === 'escoba' ||
      embedded.gameId === 'sieteymedia' ||
      embedded.gameId === 'tute' ||
      embedded.gameId === 'cinquillo'
    ) {
      const nestedAction = decideClassicAction(embedded as ClassicPlayerView);
      if (nestedAction && nestedAction.type !== 'nextRound') {
        action = nestedAction as GranRondaEmbeddedGameAction;
      }
    } else if (embedded.gameId === 'orden') {
      const nestedAction = decidePartyAction(embedded as PartyPlayerView);
      if (nestedAction && nestedAction.type !== 'nextRound') {
        action = nestedAction as GranRondaEmbeddedGameAction;
      }
    }
    if (
      embedded.gameId === 'orden' ||
      embedded.gameId === 'colores' ||
      embedded.gameId === 'mayoria' ||
      embedded.gameId === 'escala' ||
      embedded.gameId === 'matiz'
    ) {
      const nestedAction = decidePartyAction(embedded as PartyPlayerView);
      if (nestedAction && nestedAction.type !== 'nextRound') {
        action = nestedAction as GranRondaEmbeddedGameAction;
      }
    }
    if (action) return { type: 'submitGranRondaMiniGameAction', action };
    const nestedActions = new Set(embedded.me.availableActions);
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
    if (action) return { type: 'submitGranRondaMiniGameAction', action };
  }
  if (actions.has('submitGranRondaAnswer')) {
    const optionId = view.miniGame.options[0]?.id;
    return optionId ? { type: 'submitGranRondaAnswer', optionId } : null;
  }
  if (actions.has('finishGranRondaMiniGame')) return { type: 'finishGranRondaMiniGame' };
  if (actions.has('nextRound')) return { type: 'nextRound' };
  return null;
}
