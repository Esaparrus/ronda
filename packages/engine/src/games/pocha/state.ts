// Estado del juego de Pocha. Contrato §9 (reglas) + §3 (requisitos del motor).
//
// Requisitos duros del motor (§3, iguales que Chinchón):
//   - JSON-serializable puro: nada de Map, Set, Date ni clases.
//   - Inmutable: applyAction devuelve un estado nuevo.
//   - Determinista: el RNG va con semilla y contador DENTRO del estado.
//
// A diferencia de Chinchón, Pocha no tiene mazo ni descarte en juego: cada
// jugador recibe su mano completa de la ronda al repartir y la juega carta a
// carta (sin robar). Por eso no hay campos `deck`/`discard` aquí.
import type { CardId, PlayerId, PochaRoundResult, RoomCode, Suit } from '@ronda/protocol';
import type { PochaConfig } from '@ronda/protocol';

/** Fase dentro de `status === 'playing'`: cantando, o jugando la baza. */
export type PochaPhase = 'bidding' | 'trick';

/** Status global de la partida. Sin 'lobby': igual que Chinchón, el motor
 * arranca directamente en 'playing' (el lobby es responsabilidad de la sala,
 * no del motor -- `state` es null mientras la sala está en lobby). */
export type PochaStatus = 'playing' | 'roundEnd' | 'gameEnd';

/** Estado de un jugador dentro de la partida. */
export interface PochaPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number; // 0..(n-1)
  score: number; // acumulado de la partida (§9.7)
  left: boolean; // abandonó (kick/leave); invalidar la ronda en curso es responsabilidad de apps/server (§9.9), no del motor
  hand: CardId[]; // cartas que le quedan en la mano de esta ronda
  bid: number | null; // cante de esta ronda; null hasta que le toca y canta
  tricksWon: number; // bazas ganadas en la ronda en curso
  exactBidsTotal: number; // nº de rondas, en toda la partida, en que acertó el cante (desempate §9.8)
  tricksWonTotal: number; // bazas ganadas en toda la partida (desempate §9.8)
}

/** RNG dentro del estado: semilla + contador de llamadas. Serializable. */
export interface RngState {
  seed: string;
  calls: number;
}

/**
 * Estado completo de una partida de Pocha. JSON-serializable.
 * No contiene secretos más allá de las manos, que la vista censura.
 */
export interface PochaState {
  version: number; // sube en cada acción que muta estado público
  status: PochaStatus;
  phase: PochaPhase;
  config: PochaConfig;
  gameId: 'pocha';

  roomCode: RoomCode;

  rng: RngState;

  /** Nº de jugadores con los que empezó la partida. Fijo toda la partida
   * (§9.8: sin eliminación intermedia) -- determina M y la pirámide. */
  playerCount: number;

  round: number; // 1-based, 1..(2M-1)
  roundSize: number; // cartas de esta ronda (derivado de round y playerCount, §9.2)
  dealerSeat: number;

  trumpSuit: Suit | null; // null si config.trump === false
  trumpCardId: CardId | null;

  turnSeat: number | null; // a quién le toca cantar (fase 'bidding') o jugar (fase 'trick')
  leadSuit: Suit | null; // palo que salió en la baza en curso; null si aún no se jugó ninguna carta
  currentTrick: { seat: number; cardId: CardId }[]; // cartas jugadas en la baza en curso, en orden

  players: PochaPlayer[];

  roundResult: PochaRoundResult | null; // solo en status 'roundEnd' | 'gameEnd'
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

/** Jugadores no abandonados, en orden de asiento. */
export function activePlayers(state: PochaState): PochaPlayer[] {
  return state.players.filter((p) => !p.left);
}

/** Siguiente asiento activo a la derecha de `seat` (sentido antihorario). */
export function nextActiveSeat(state: PochaState, seat: number): number | null {
  const n = state.players.length;
  for (let i = 1; i <= n; i++) {
    const cand = (seat - i + n) % n;
    const p = state.players[cand];
    if (p && !p.left) return cand;
  }
  return null;
}

/** Jugador por playerId, o undefined. */
export function findPlayer(state: PochaState, playerId: PlayerId): PochaPlayer | undefined {
  return state.players.find((p) => p.playerId === playerId);
}

/** ¿Es el turno de este jugador y la partida está en juego? */
export function isPlayerTurn(state: PochaState, playerId: PlayerId): boolean {
  if (state.status !== 'playing') return false;
  const seat = state.turnSeat;
  if (seat === null) return false;
  const p = state.players[seat];
  return p?.playerId === playerId;
}
