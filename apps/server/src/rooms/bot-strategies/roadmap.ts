import type { GameAction, RoadmapPlayerView } from '@ronda/protocol';

/**
 * Política mínima para los juegos de preguntas. Solo usa la vista censurada
 * del robot: en Banderas no conoce la solución, así que elige una opción
 * válida y deja que el marcador resuelva el acierto como a cualquier persona.
 */
export function decideRoadmapAction(view: RoadmapPlayerView): GameAction | null {
  if (view.gameId === 'banderas') {
    if (!view.me.availableActions.includes('submitFlag')) return null;
    const option = view.flags.options[0];
    return option ? { type: 'submitFlag', optionId: option.id } : null;
  }

  if (view.gameId === 'cifras') {
    if (view.cifras.kind === 'estimate') {
      return view.me.availableActions.includes('submitNumber')
        ? { type: 'submitNumber', value: 0 }
        : null;
    }
    if (view.cifras.kind === 'compare') {
      const option = view.cifras.items[0];
      return option && view.me.availableActions.includes('submitChoice')
        ? { type: 'submitChoice', optionId: option.id }
        : null;
    }
    return view.me.availableActions.includes('submitOrder')
      ? { type: 'submitOrder', order: view.cifras.items.map((item) => item.id) }
      : null;
  }

  if (view.gameId === 'quienloharia') {
    if (!view.me.availableActions.includes('submitWhoVote')) return null;
    const target = view.players.find(
      (player) => view.who.allowSelfVote || player.playerId !== view.me.playerId,
    );
    return target ? { type: 'submitWhoVote', targetPlayerId: target.playerId } : null;
  }

  return view.me.availableActions.includes('submitSentence')
    ? { type: 'submitSentence', answer: 'respuesta' }
    : null;
}
