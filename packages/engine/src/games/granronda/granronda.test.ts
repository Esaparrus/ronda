import { describe, expect, it } from 'vitest';
import { DEFAULT_GRAN_RONDA_CONFIG, type GameAction } from '@ronda/protocol';
import { createInitialState, applyAction } from './reducer.ts';
import { getPlayerView } from './views.ts';
import type { GranRondaState } from './state.ts';

const players = [
  { playerId: 'p1', nick: 'Ana', seat: 0, isBot: false },
  { playerId: 'p2', nick: 'Bruno', seat: 1, isBot: false },
  { playerId: 'p3', nick: 'Cris', seat: 2, isBot: false },
];

function makeState(): GranRondaState {
  return createInitialState({
    config: DEFAULT_GRAN_RONDA_CONFIG,
    players,
    seed: 'granronda-test',
    roomCode: 'TEST',
  });
}

function play(action: GameAction, state: GranRondaState, playerId: string): GranRondaState {
  const result = applyAction(state, playerId, action, 0);
  if (!result.ok) {
    throw new Error(`${result.code} action=${action.type} phase=${state.phase} turn=${state.turnSeat} player=${playerId}`);
  }
  return result.value.state;
}

function moveCurrentPlayer(state: GranRondaState): GranRondaState {
  const player = state.players.find((candidate) => candidate.seat === state.turnSeat);
  if (!player) throw new Error('No hay jugador activo');
  if (state.phase === 'routeChoice') {
    const view = getPlayerView(state, player.playerId);
    const option = view.routeOptions[0];
    if (!option) throw new Error('Falta una ruta');
    return play({ type: 'chooseGranRondaPath', nextSpaceId: option }, state, player.playerId);
  }
  return play({ type: 'rollGranRonda' }, state, player.playerId);
}

describe('La Gran Ronda', () => {
  it('crea un tablero con economía y turnos', () => {
    const state = makeState();
    expect(state.board.length).toBeGreaterThan(15);
    expect(state.phase).toBe('movement');
    expect(state.turnSeat).toBe(0);
    expect(state.players.every((player) => player.coins === 5)).toBe(true);
  });

  it('avanza a minijuego después de mover a toda la mesa y revela respuestas', () => {
    let state = makeState();
    while (state.phase === 'movement' || state.phase === 'routeChoice') {
      state = moveCurrentPlayer(state);
    }
    expect(state.phase).toBe('minigameInput');
    expect(state.turnSeat).toBeNull();

    for (const player of players) {
      state = play({ type: 'submitGranRondaAnswer', optionId: 'a' }, state, player.playerId);
    }
    expect(state.phase).toBe('minigameReveal');
    expect(state.miniGame.scoreDeltas).not.toBeNull();
  });

  it('solo permite cerrar el minijuego al anfitrión y mantiene el secreto', () => {
    let state = makeState();
    while (state.phase === 'movement' || state.phase === 'routeChoice') {
      state = moveCurrentPlayer(state);
    }
    state = play({ type: 'submitGranRondaAnswer', optionId: 'b' }, state, 'p1');
    const beforeReveal = getPlayerView(state, 'p2');
    expect(beforeReveal.miniGame.answers).toBeNull();
    expect(beforeReveal.me.selectedOptionId).toBeNull();

    const rejected = applyAction(state, 'p2', { type: 'finishGranRondaMiniGame' }, 0);
    expect(rejected.ok).toBe(false);
    state = play({ type: 'finishGranRondaMiniGame' }, state, 'p1');
    expect(state.phase).toBe('minigameReveal');
  });
});
