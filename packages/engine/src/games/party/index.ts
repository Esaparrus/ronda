// Registro de los modos sociales. Comparten estado y reducer, pero cada
// módulo conserva su propio gameId para que una sala nunca pueda mezclar
// acciones o configuración de otro juego.

import type { GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import { applyAction, createPartyState } from './reducer.ts';
import type { PartyState } from './state.ts';
import { getPlayerView, getTableView } from './views.ts';
import type { PartyGameId } from '@ronda/protocol';

function makePartyModule(id: PartyGameId): GameModule<PartyState, GameAction> {
  return {
    id,
    createInitialState: (input) => createPartyState(input, id),
    applyAction: (state: PartyState, playerId: PlayerId, action: GameAction, now: number) =>
      applyAction(state, playerId, action, now),
    getPlayerView,
    getTableView,
    isFinished: (state: PartyState) => state.status === 'gameEnd',
  };
}

export const ordenModule = makePartyModule('orden');
export const coloresModule = makePartyModule('colores');
export const mayoriaModule = makePartyModule('mayoria');
export const escalaModule = makePartyModule('escala');
export const matizModule = makePartyModule('matiz');

registerGame(ordenModule);
registerGame(coloresModule);
registerGame(mayoriaModule);
registerGame(escalaModule);
registerGame(matizModule);

export * from './state.ts';
export * from './reducer.ts';
export * from './views.ts';
export * from './content.ts';
