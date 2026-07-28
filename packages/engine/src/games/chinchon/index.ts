// Módulo de juego Chinchón. Contrato §3.
//
// Arma el GameModule<ChinchonState, GameAction> y lo registra en GAMES para que
// el servidor (P6) pueda resolverlo por gameId.
import type { GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import { type ChinchonState } from './state.ts';
import { createInitialState, applyAction } from './reducer.ts';
import { getPlayerView, getTableView } from './views.ts';

export const chinchonModule: GameModule<ChinchonState, GameAction> = {
  id: 'chinchon',
  createInitialState,
  applyAction: (state: ChinchonState, playerId: PlayerId, action: GameAction, now: number) =>
    applyAction(state, playerId, action, now),
  getPlayerView,
  getTableView,
  isFinished: (state: ChinchonState) => state.status === 'gameEnd',
};

// Registro automático al importar el paquete.
registerGame(chinchonModule);

export * from './state.ts';
export * from './reducer.ts';
export * from './views.ts';
export { solveHand, isChinchon, canCloseWith, closableDiscards } from './melds.ts';
