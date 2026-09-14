// Estadísticas del grupo, guardadas por sala. Roadmap "Después del MVP" §3
// de 02-PAQUETES.md ("Estadísticas del grupo, guardadas por sala").
//
// Alcance deliberado: son de la SALA, no de un jugador. No hay cuentas ni
// identidad persistente (00-MASTER.md §1, cambio 12), así que estas cifras
// viven mientras viva la sala y se acumulan entre partidas sucesivas de esa
// misma sala (revanchas). Nunca cruzan salas ni identifican a nadie fuera de
// su apodo.
//
// No viajan dentro de `PlayerView`/`TableView`: se piden a demanda con
// `room:stats` (§2.3). Meterlas en cada snapshot habría engordado el mensaje
// más frecuente del protocolo para un dato que solo se mira al abrir el
// panel o al terminar una partida.
import type { GameId, PlayerId, RoomCode } from './ids.ts';

export interface RoomStatsRow {
  playerId: PlayerId;
  nick: string;
  seat: number;
  /** Partidas TERMINADAS en las que este jugador estaba en la sala. */
  matches: number;
  /**
   * Partidas ganadas. En Mus gana una PAREJA (§12.12), así que la victoria
   * se le apunta a los dos miembros del equipo ganador: la fila sigue siendo
   * por jugador porque la sala no tiene parejas fijas entre partidas -- una
   * revancha con los asientos cambiados es otra pareja.
   */
  wins: number;
  /**
   * Rondas jugadas (suma de las rondas de cada partida terminada). En Mus
   * son MANOS (`handNumber`), no juegos: es el equivalente natural de la
   * ronda de los otros dos.
   */
  rounds: number;
  /**
   * Suma de las puntuaciones finales de cada partida terminada. En Mus el
   * jugador no tiene puntuación (`PublicPlayer.score` va siempre a 0, §12.12)
   * y lo que se acumula aquí son los JUEGOS (vacas) que ganó su pareja en esa
   * partida -- lo único que sigue siendo verdad al mirarlo por jugador.
   */
  totalScore: number;
  /**
   * Mejor y peor puntuación final. "Mejor" depende del juego: en Chinchón es
   * la MÁS BAJA (§5, se elimina quien pasa del umbral), y en Pocha (§9.7) y
   * en Mus la MÁS ALTA. El servidor ya aplica el criterio del juego de la
   * sala; la interfaz solo los pinta. null = sin partidas aún.
   */
  bestScore: number | null;
  worstScore: number | null;
}

export interface RoomStats {
  roomCode: RoomCode;
  gameId: GameId;
  /** Partidas terminadas en esta sala desde que se creó. */
  matches: number;
  /** Una fila por jugador que haya terminado al menos una partida, ya ordenada. */
  rows: RoomStatsRow[];
}
