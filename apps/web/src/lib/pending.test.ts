import { describe, expect, it } from 'vitest';
import type { PublicPlayer } from '@ronda/protocol';
import { pendingConfirmations } from './pending.ts';

function player(overrides: Partial<PublicPlayer>): PublicPlayer {
  return {
    playerId: 'p1',
    nick: 'Ana',
    seat: 0,
    colorIndex: 0,
    score: 0,
    handCount: 7,
    connected: true,
    isHost: true,
    eliminated: false,
    teamIndex: null,
    ...overrides,
  };
}

describe('pendingConfirmations', () => {
  it('devuelve los jugadores activos que no están en votes', () => {
    const players = [player({ playerId: 'p1' }), player({ playerId: 'p2', isHost: false })];
    expect(pendingConfirmations(players, ['p1']).map((p) => p.playerId)).toEqual(['p2']);
  });

  it('un jugador desconectado no cuenta como pendiente', () => {
    const players = [player({ playerId: 'p1', connected: false })];
    expect(pendingConfirmations(players, [])).toEqual([]);
  });

  it('un jugador eliminado no cuenta como pendiente', () => {
    const players = [player({ playerId: 'p1', eliminated: true })];
    expect(pendingConfirmations(players, [])).toEqual([]);
  });

  it('con todos votados, no queda nadie pendiente', () => {
    const players = [player({ playerId: 'p1' }), player({ playerId: 'p2' })];
    expect(pendingConfirmations(players, ['p1', 'p2'])).toEqual([]);
  });
});
