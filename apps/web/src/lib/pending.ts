// Quién falta por confirmar en las pantallas de fin de ronda/partida
// (contrato P16: «Siguiente ronda»... y muestra quién falta por confirmar";
// «Revancha»... y muestra los votos"). Ambas pantallas reutilizan el mismo
// campo del servidor, `rematchVotes` (contrato §2.5): en `roundEnd`
// contiene quién ya pulsó «Siguiente ronda»; en `gameEnd`, quién ya votó
// revancha. El servidor decide cuándo avanza (todos los CONECTADOS y no
// eliminados); aquí solo se refleja esa misma condición para pintar la
// lista de quién falta, sin inventar ninguna regla nueva.
import type { PlayerId, PublicPlayer } from '@ronda/protocol';

/**
 * Jugadores activos (conectados, no eliminados) que todavía no aparecen en
 * `votes`. Un jugador desconectado no cuenta como "falta": el servidor
 * tampoco lo espera (mismo criterio que `voteRematch`/`applyNextRound` en
 * el motor: solo cuentan los conectados y no eliminados).
 */
export function pendingConfirmations(
  players: readonly PublicPlayer[],
  votes: readonly PlayerId[],
): PublicPlayer[] {
  return players.filter((p) => !p.eliminated && p.connected && !votes.includes(p.playerId));
}
