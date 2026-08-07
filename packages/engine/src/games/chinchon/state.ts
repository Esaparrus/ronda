// Estado del juego de Chinchón. Contrato §4 (persistencia) + §5 (reglas).
//
// Requisitos duros del motor (§3):
//   - JSON-serializable puro: nada de Map, Set, Date ni clases.
//   - Inmutable: applyAction devuelve un estado nuevo.
//   - Determinista: el RNG va con semilla y contador DENTRO del estado.
import type { CardId, PlayerId, RoomCode } from '@ronda/protocol';
import type { ChinchonConfig, RoundResult } from '@ronda/protocol';

/** Fase del turno del jugador activo. null si la partida no está en juego. */
export type TurnPhase = 'draw' | 'discard' | null;

/** Status global de la partida. */
export type GameStatus = 'lobby' | 'playing' | 'roundEnd' | 'gameEnd';

/** Estado de un jugador dentro de la partida. */
export interface ChinchonPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number; // 0..3
  score: number; // acumulado de la partida
  eliminated: boolean;
  left: boolean; // abandonó la partida (kick/leave en juego)
  hand: CardId[]; // orden que el jugador dejó (sortHand lo cambia)
  lockedCardId: CardId | null; // carta robada del descarte no descartable este turno
}

/** RNG dentro del estado: semilla + contador de llamadas. Serializable. */
export interface RngState {
  seed: string;
  calls: number;
}

/**
 * Estado completo de una partida de Chinchón. JSON-serializable.
 * No contiene secretos más allá de las manos, que la vista censura.
 */
export interface ChinchonState {
  version: number; // sube en cada acción que muta estado público
  status: GameStatus;
  config: ChinchonConfig;
  gameId: 'chinchon';

  // Identidad de la sala (la vista lo expone).
  roomCode: RoomCode;

  // Semilla y contador del RNG (dentro del estado para determinismo).
  rng: RngState;

  // Ronda actual (1-based) y repartidor de la ronda.
  round: number;
  dealerSeat: number;

  // Turno activo.
  turnSeat: number | null;
  turnPhase: TurnPhase;
  /** Instante límite del turno, gestionado por el servidor; null sin tiempo. */
  turnDeadlineAt?: number | null;

  // Jugadores en orden de asiento.
  players: ChinchonPlayer[];

  // Mazo y descarte (cartas concretas, privadas del mazo).
  deck: CardId[];
  discard: CardId[]; // pila; discard[discard.length-1] es la cima visible

  // Resultado de la última ronda (null durante 'playing').
  roundResult: RoundResult | null;

  // Ganador de la partida (null hasta gameEnd).
  winnerId: PlayerId | null;

  // Jugadores que han votado revancha.
  rematchVotes: PlayerId[];

  // Idempotencia: ids de acción ya procesados. Creciente; en producción el
  // servidor lo mantiene acotado, pero el motor no lo poda.
  processedActionIds: string[];
}

/** Jugadores no eliminados y no abandonados, en orden de asiento. */
export function activePlayers(state: ChinchonState): ChinchonPlayer[] {
  return state.players.filter((p) => !p.eliminated && !p.left);
}

/** Siguiente asiento activo a partir de `seat` (excluido), rotando. */
export function nextActiveSeat(state: ChinchonState, seat: number): number | null {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const cand = (seat + i) % n;
    const p = state.players[cand];
    if (p && !p.eliminated && !p.left) return cand;
  }
  return null;
}

/** Jugador por playerId, o undefined. */
export function findPlayer(state: ChinchonState, playerId: PlayerId): ChinchonPlayer | undefined {
  return state.players.find((p) => p.playerId === playerId);
}

/** ¿Es el turno de este jugador y la partida está en juego? */
export function isPlayerTurn(state: ChinchonState, playerId: PlayerId): boolean {
  if (state.status !== 'playing') return false;
  const seat = state.turnSeat;
  if (seat === null) return false;
  const p = state.players[seat];
  return p?.playerId === playerId;
}
