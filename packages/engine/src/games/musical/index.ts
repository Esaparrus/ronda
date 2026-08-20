// Registro del juego Musical.

import type { GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import { applyAction, createInitialState } from './reducer.ts';
import type { MusicalState } from './state.ts';
import { getPlayerView, getTableView } from './views.ts';

export const musicalModule: GameModule<MusicalState, GameAction> = {
  id: 'musical',
  createInitialState: (input) => createInitialState(input),
  applyAction: (state: MusicalState, playerId: PlayerId, action: GameAction, now: number) =>
    applyAction(state, playerId, action, now),
  getPlayerView,
  getTableView,
  isFinished: (state: MusicalState) => state.status === 'gameEnd',
};

registerGame(musicalModule);

export * from './state.ts';
export * from './reducer.ts';
export * from './views.ts';
