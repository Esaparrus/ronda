// Registro de juegos. Contrato §3.
//
// Por ahora vacío: Chinchón se registra en P4. Definido como Partial<...> para
// que "juego no encontrado" sea simplemente undefined (→ error GAME_NOT_FOUND
// en el servidor, no un crash).
import type { GameId } from '@ronda/protocol';
import type { AnyGameModule } from './types.ts';

export const GAMES: Partial<Record<GameId, AnyGameModule>> = {};

/** Registra un módulo de juego. Usado por los paquetes de cada juego (P4). */
export function registerGame(module: AnyGameModule): void {
  GAMES[module.id] = module;
}

/** Devuelve el módulo de un juego o undefined si no está registrado. */
export function getGame(id: GameId): AnyGameModule | undefined {
  return GAMES[id];
}
