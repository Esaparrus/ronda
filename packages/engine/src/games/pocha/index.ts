// Módulo de juego Pocha. Contrato §3, §9, §10.
//
// Arma el GameModule<PochaState, GameAction> y lo registra en GAMES para que
// el servidor (P23, todavía sin empezar) pueda resolverlo por gameId, igual
// que Chinchón. `GameModule<S, A>` no necesitó ningún cambio (§10.8): la
// interfaz ya era genérica de verdad.
import type { GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import { type PochaState } from './state.ts';
import { createInitialState, applyAction } from './reducer.ts';
import { getPlayerView, getTableView } from './views.ts';

export const pochaModule: GameModule<PochaState, GameAction> = {
  id: 'pocha',
  createInitialState,
  applyAction: (state: PochaState, playerId: PlayerId, action: GameAction, now: number) =>
    applyAction(state, playerId, action, now),
  getPlayerView,
  getTableView,
  isFinished: (state: PochaState) => state.status === 'gameEnd',
};

// Registro automático al importar el paquete.
registerGame(pochaModule);

export * from './state.ts';
export * from './reducer.ts';
export * from './views.ts';
export * from './deck.ts';
export * from './rounds.ts';
export { resolveTrick, fuerza } from './trick.ts';
