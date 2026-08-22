// Registro del juego Precio justo.

import type { GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import { applyAction, createInitialState } from './reducer.ts';
import type { PrecioJustoState } from './state.ts';
import { getPlayerView, getTableView } from './views.ts';

export const precioJustoModule: GameModule<PrecioJustoState, GameAction> = {
  id: 'preciojusto',
  createInitialState: (input) => createInitialState(input),
  applyAction: (state: PrecioJustoState, playerId: PlayerId, action: GameAction, now: number) =>
    applyAction(state, playerId, action, now),
  getPlayerView,
  getTableView,
  isFinished: (state: PrecioJustoState) => state.status === 'gameEnd',
};

registerGame(precioJustoModule);

export * from './content.ts';
export * from './state.ts';
export * from './reducer.ts';
export * from './views.ts';
