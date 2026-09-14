import type { ClassicConfig, ClassicGameId, GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import { applyClassicAction, createClassicState } from './reducer.ts';
import type { ClassicState } from './state.ts';
import { getClassicPlayerView, getClassicTableView } from './views.ts';

function makeClassicModule(id: ClassicGameId): GameModule<ClassicState, GameAction> {
  return {
    id,
    createInitialState: (input) =>
      createClassicState(
        {
          ...input,
          config: input.config as ClassicConfig,
        },
        id,
      ),
    applyAction: (state: ClassicState, playerId: PlayerId, action: GameAction, now: number) =>
      applyClassicAction(state, playerId, action, now),
    getPlayerView: getClassicPlayerView,
    getTableView: getClassicTableView,
    isFinished: (state: ClassicState) => state.status === 'gameEnd',
  };
}

export const briscaModule = makeClassicModule('brisca');
export const escobaModule = makeClassicModule('escoba');
export const sieteYMediaModule = makeClassicModule('sieteymedia');
export const tuteModule = makeClassicModule('tute');
export const cinquilloModule = makeClassicModule('cinquillo');

registerGame(briscaModule);
registerGame(escobaModule);
registerGame(sieteYMediaModule);
registerGame(tuteModule);
registerGame(cinquilloModule);

export * from './state.ts';
export * from './rules.ts';
export * from './reducer.ts';
export * from './views.ts';
