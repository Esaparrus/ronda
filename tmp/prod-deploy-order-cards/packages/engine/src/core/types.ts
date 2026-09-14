// Contrato del módulo de juego. Contrato §3.
//
// Cada juego (por ahora solo Chinchón) implementa GameModule<S, A>:
//   S = estado del juego (JSON-serializable, inmutable, determinista)
//   A = acción que un jugador pide ejecutar
//
// El servidor (RoomManager) llama a GAMES[gameId].applyAction(...). El motor
// NUNCA ve red, ni base de datos, ni reloj: el tiempo se pasa como `now`.
import type { GameId, PlayerId } from '@ronda/protocol';
import type { GameConfig } from '@ronda/protocol';
import type { PlayerView, TableView } from '@ronda/protocol';
import type { GameEvent } from '@ronda/protocol';
import type { Result } from '@ronda/protocol';

/** Input para crear el estado inicial de una partida. */
export interface CreateInitialStateInput {
  config: GameConfig;
  players: { playerId: PlayerId; nick: string; seat: number }[];
  seed: string;
}

/**
 * Módulo de juego. Todas las implementaciones deben cumplir:
 *   1. Puras y deterministas (sin Math.random, sin Date, sin red, sin BD).
 *   2. Inmutables: applyAction devuelve un estado NUEVO.
 *   3. RNG con semilla dentro del estado.
 *   4. Serializables (JSON.parse(JSON.stringify(state)) es equivalente).
 *   5. Validación total en applyAction.
 */
export interface GameModule<S, A> {
  readonly id: GameId;
  createInitialState(input: CreateInitialStateInput): S;
  applyAction(
    state: S,
    playerId: PlayerId,
    action: A,
    now: number,
  ): Result<{ state: S; events: GameEvent[] }>;
  getPlayerView(state: S, playerId: PlayerId): PlayerView;
  getTableView(state: S): TableView;
  isFinished(state: S): boolean;
}

/** Cualquier GameModule concreto, con tipos borrados para el registro GAMES. */
export type AnyGameModule = GameModule<unknown, unknown>;
