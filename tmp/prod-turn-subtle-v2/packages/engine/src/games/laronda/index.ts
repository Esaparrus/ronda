import type { GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import { applyRondaAction, createRondaState } from './reducer.ts';
import type { RondaState } from './state.ts';
import { getRondaPlayerView, getRondaTableView } from './views.ts';

export const laRondaModule: GameModule<RondaState, GameAction> = {
  id: 'laronda',
  createInitialState: (input) =>
    createRondaState({
      ...input,
      config: input.config as Extract<typeof input.config, { gameId: 'laronda' }>,
    }),
  applyAction: (state: RondaState, playerId: PlayerId, action: GameAction, now: number) =>
    applyRondaAction(state, playerId, action, now),
  getPlayerView: getRondaPlayerView,
  getTableView: getRondaTableView,
  isFinished: (state: RondaState) => state.status === 'gameEnd',
};

registerGame(laRondaModule);

export * from './cards.ts';
export * from './state.ts';
export * from './rules.ts';
export * from './reducer.ts';
export * from './views.ts';
