import type { GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import { applyAction, createInitialState } from './reducer.ts';
import type { GranRondaState } from './state.ts';
import { getPlayerView, getTableView } from './views.ts';

export const granRondaModule: GameModule<GranRondaState, GameAction> = {
  id: 'granronda',
  createInitialState: (input) => createInitialState(input),
  applyAction: (state: GranRondaState, playerId: PlayerId, action: GameAction, now: number) =>
    applyAction(state, playerId, action, now),
  getPlayerView,
  getTableView,
  isFinished: (state: GranRondaState) => state.status === 'gameEnd',
};

registerGame(granRondaModule);

export * from './content.ts';
export * from './rules.ts';
export * from './state.ts';
export * from './reducer.ts';
export * from './views.ts';
