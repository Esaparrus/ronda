import type { GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import {
  applyAction,
  createBanderasState,
  createCifrasState,
  createCompletaLaFraseState,
  createQuienLoHariaState,
} from './reducer.ts';
import type { RoadmapState } from './state.ts';
import { getPlayerView, getTableView } from './views.ts';

function makeRoadmapModule(id: RoadmapState['gameId']): GameModule<Extract<RoadmapState, { gameId: typeof id }>, GameAction> {
  return {
    id,
    createInitialState: (input) => {
      if (id === 'banderas') return createBanderasState(input) as Extract<RoadmapState, { gameId: typeof id }>;
      if (id === 'cifras') return createCifrasState(input) as Extract<RoadmapState, { gameId: typeof id }>;
      if (id === 'quienloharia') return createQuienLoHariaState(input) as Extract<RoadmapState, { gameId: typeof id }>;
      return createCompletaLaFraseState(input) as Extract<RoadmapState, { gameId: typeof id }>;
    },
    applyAction: (state, playerId: PlayerId, action: GameAction, now: number) => applyAction(state, playerId, action, now),
    getPlayerView: (state, playerId) => getPlayerView(state, playerId),
    getTableView: (state) => getTableView(state),
    isFinished: (state) => state.status === 'gameEnd',
  };
}

export const banderasModule = makeRoadmapModule('banderas');
export const cifrasModule = makeRoadmapModule('cifras');
export const quienLoHariaModule = makeRoadmapModule('quienloharia');
export const completaLaFraseModule = makeRoadmapModule('completalafrase');

registerGame(banderasModule);
registerGame(cifrasModule);
registerGame(quienLoHariaModule);
registerGame(completaLaFraseModule);

export * from './content.ts';
export * from './state.ts';
export * from './reducer.ts';
export * from './views.ts';
