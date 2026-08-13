import { describe, expect, it } from 'vitest';
import { DEFAULT_ORDEN_CONFIG } from '@ronda/protocol';
import { RoomManager } from './room-manager.ts';

describe('salas de modos sociales', () => {
  it('acepta la primera carta y rechaza la segunda con la versión antigua', () => {
    const manager = new RoomManager();
    const first = manager.createRoom({
      gameId: 'orden',
      config: DEFAULT_ORDEN_CONFIG,
      nick: 'Ana',
      now: 1,
    });
    if (!first.ok) throw new Error(first.code);
    const second = manager.joinRoom({ roomCode: first.value.roomCode, nick: 'Beto', now: 1 });
    if (!second.ok) throw new Error(second.code);
    const started = manager.start({ roomCode: first.value.roomCode, playerId: first.value.playerId, now: 1 });
    expect(started.ok).toBe(true);

    const room = manager.getRoomByCode(first.value.roomCode);
    if (!room?.state || room.state.gameId !== 'orden') throw new Error('Orden no empezó');
    const p1 = room.state.players.find((player) => player.playerId === first.value.playerId);
    const p2 = room.state.players.find((player) => player.playerId === second.value.playerId);
    const p1Value = Number(p1?.hand[0]);
    const p2Value = Number(p2?.hand[0]);

    const accepted = manager.applyAction({
      roomCode: room.code,
      playerId: first.value.playerId,
      clientActionId: 'first-action',
      expectedVersion: 0,
      action: { type: 'playNumber', value: p1Value },
      now: 2,
    });
    const rejected = manager.applyAction({
      roomCode: room.code,
      playerId: second.value.playerId,
      clientActionId: 'second-action',
      expectedVersion: 0,
      action: { type: 'playNumber', value: p2Value },
      now: 2,
    });

    expect(accepted.ok).toBe(true);
    expect(rejected).toEqual({ ok: false, code: 'STALE_VERSION' });
  });
});
