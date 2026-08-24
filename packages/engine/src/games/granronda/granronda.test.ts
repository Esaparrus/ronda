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
    config: { ...DEFAULT_GRAN_RONDA_CONFIG, rounds: 4 },
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

function currentPlayer(state: GranRondaState) {
  const player = state.players.find((candidate) => candidate.seat === state.turnSeat);
  if (!player) throw new Error('No hay jugador activo');
  return player;
}

function firstRoute(playerId: string, state: GranRondaState): string {
  const option = getPlayerView(state, playerId).routeOptions[0];
  if (!option) throw new Error('Falta una ruta');
  return option;
}

function resolveCurrentTurn(state: GranRondaState): GranRondaState {
  const player = currentPlayer(state);
  let next = state;
  if (next.phase === 'movement') {
    next = play({ type: 'rollGranRonda' }, next, player.playerId);
  }
  if (next.phase === 'routeChoice') {
    const view = getPlayerView(next, player.playerId);
    const option = view.routeOptions[0];
    if (!option) throw new Error('Falta una ruta');
    next = play({ type: 'chooseGranRondaPath', nextSpaceId: option }, next, player.playerId);
  }
  while (next.phase === 'moving') {
    next = play({ type: 'advanceGranRondaMovement' }, next, player.playerId);
    if (next.phase === 'routeChoice') {
      const view = getPlayerView(next, player.playerId);
      const option = view.routeOptions[0];
      if (!option) throw new Error('Falta una ruta intermedia');
      next = play({ type: 'chooseGranRondaPath', nextSpaceId: option }, next, player.playerId);
    }
  }
  if (next.phase === 'resolving') {
    next = play({ type: 'continueGranRondaResolution' }, next, player.playerId);
  }
  return next;
}

describe('La Gran Ronda', () => {
  it('crea un mapa con coordenadas, economía y turnos', () => {
    const state = makeState();
    expect(state.board.length).toBeGreaterThan(15);
    expect(state.board.every((space) => space.x > 0 && space.x < 100 && space.y > 0 && space.y < 100)).toBe(true);
    expect(state.phase).toBe('movement');
    expect(state.turnSeat).toBe(0);
    expect(state.players.every((player) => player.coins === 5)).toBe(true);
  });

  it('publica la tirada, anima pasos y resuelve la casilla antes de cambiar turno', () => {
    let state = makeState();
    state = play({ type: 'rollGranRonda' }, state, 'p1');
    expect(state.movement?.roll).toBeGreaterThanOrEqual(1);
    expect(state.movement?.roll).toBeLessThanOrEqual(6);
    expect(['moving', 'routeChoice']).toContain(state.phase);

    if (state.phase === 'routeChoice') {
      state = play({ type: 'chooseGranRondaPath', nextSpaceId: firstRoute('p1', state) }, state, 'p1');
    }
    const startPathLength = state.movement?.path.length ?? 0;
    state = play({ type: 'advanceGranRondaMovement' }, state, 'p1');
    expect(state.movement?.path.length).toBeGreaterThan(startPathLength);

    while (state.phase === 'moving' || state.phase === 'routeChoice') {
      if (state.phase === 'routeChoice') {
        state = play({ type: 'chooseGranRondaPath', nextSpaceId: firstRoute('p1', state) }, state, 'p1');
      } else {
        state = play({ type: 'advanceGranRondaMovement' }, state, 'p1');
      }
    }
    expect(state.phase).toBe('resolving');
    expect(state.resolution).not.toBeNull();
    expect(state.turnSeat).toBe(0);

    state = play({ type: 'continueGranRondaResolution' }, state, 'p1');
    expect(state.turnSeat).toBe(1);
    expect(state.movement).toBeNull();
  });

  it('termina la ronda sin lanzar preguntas genéricas y deja avanzar al anfitrión', () => {
    let state = makeState();
    while (state.phase !== 'roundEnd') state = resolveCurrentTurn(state);
    expect(state.status).toBe('playing');
    expect(state.phase).toBe('roundEnd');
    expect(state.miniGame.submissions).toEqual({});

    const rejected = applyAction(state, 'p2', { type: 'nextRound' }, 0);
    expect(rejected.ok).toBe(false);
    state = play({ type: 'nextRound' }, state, 'p1');
    expect(state.round).toBe(2);
    expect(state.phase).toBe('movement');
    expect(state.turnSeat).toBe(1);
  });
});
