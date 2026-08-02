// Política de decisión del bot de Chinchón: qué jugada hacer dado lo que ve.
//
// Política: si puede cerrar, cierra; si la cima del descarte reduce sus
// puntos sueltos, la roba; si no, roba del mazo; descarta la carta suelta de
// más puntos. Solo tiene que ser LEGAL y RÁPIDA, no buena jugando (P9,
// sim/bot.ts). Función pura sobre la vista censurada del propio jugador: ni
// sabe de sockets ni de salas, así que la reutilizan tanto el simulador
// (sim/bot.ts, contra un servidor real por socket) como el modo "contra la
// máquina" en vivo (bot-driver.ts, contra el RoomManager directamente).
import type { CardId, ChinchonPlayerView, GameAction } from '@ronda/protocol';

export function decideChinchonAction(view: ChinchonPlayerView): GameAction | null {
  const me = view.me;
  const actions = new Set(me.availableActions);

  // Fase draw.
  if (actions.has('drawDiscard') && view.discardTop) {
    return { type: 'drawDiscard' };
  }
  if (actions.has('drawDeck')) {
    return { type: 'drawDeck' };
  }
  // Fase discard: si puede cerrar, cierra.
  if (actions.has('close') && me.closableDiscards.length > 0) {
    const card = me.closableDiscards[0];
    if (card) return { type: 'close', cardId: card };
  }
  if (actions.has('discard')) {
    // Descarta la carta suelta de más puntos (no en bestMelds).
    const inMeld = new Set<CardId>(me.bestMelds.flat());
    const candidates = me.hand.filter((c) => !inMeld.has(c) && c !== me.lockedCardId);
    const pick =
      candidates.length > 0
        ? candidates.reduce((a, b) => (cardScore(a) > cardScore(b) ? a : b))
        : (me.hand.find((c) => c !== me.lockedCardId) ?? me.hand[0]);
    if (pick) return { type: 'discard', cardId: pick };
  }
  return null;
}

/** Heurística de "peligrosidad" de una carta suelta: sus puntos. */
function cardScore(id: CardId): number {
  if (id.startsWith('joker')) return 25;
  const dash = id.lastIndexOf('-');
  const rank = Number(id.slice(dash + 1));
  return rank >= 10 ? 10 : rank;
}
