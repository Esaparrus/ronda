// Módulo de juego Mus. Contrato §3, §12.
//
// Arma el GameModule<MusState, GameAction> y lo registra en GAMES para que el
// servidor lo resuelva por gameId, igual que Chinchón y Pocha. `GameModule`
// tampoco necesitó cambios aquí: la interfaz ya era genérica de verdad.
//
// Alcance de P28: SOLO el motor. Servidor e interfaz de Mus siguen sin
// empezar, y §12.12 avisa de que no son mecánicos -- `PublicPlayer.teamIndex`
// y `MusCommonView.teams` ya existen, pero la clasificación de `/sala` y
// `/mesa` (P16) y las estadísticas por jugador de §11.2 siguen contando
// `wins` por jugador y hay que adaptarlas antes de poder jugar una partida
// de Mus de principio a fin.
import type { GameAction, PlayerId } from '@ronda/protocol';
import type { GameModule } from '../../core/types.ts';
import { registerGame } from '../../core/registry.ts';
import type { MusState } from './state.ts';
import { createInitialState, applyAction } from './reducer.ts';
import { getPlayerView, getTableView } from './views.ts';

export const musModule: GameModule<MusState, GameAction> = {
  id: 'mus',
  createInitialState,
  applyAction: (state: MusState, playerId: PlayerId, action: GameAction, now: number) =>
    applyAction(state, playerId, action, now),
  getPlayerView,
  getTableView,
  isFinished: (state: MusState) => state.status === 'gameEnd',
};

// Registro automático al importar el paquete.
registerGame(musModule);

export * from './state.ts';
export * from './reducer.ts';
export * from './views.ts';
export * from './deck.ts';
export * from './hand.ts';
export * from './recuento.ts';
