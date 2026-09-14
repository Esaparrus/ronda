import { describe, expect, it, vi } from 'vitest';
import {
  COLOR_ANSWER_SECONDS,
  DEFAULT_COLORES_CONFIG,
  DEFAULT_ORDEN_CONFIG,
} from '@ronda/protocol';
import { colorQuestionById } from '@ronda/engine';
import { RoomManager } from './room-manager.ts';

const NOW = 1_700_000_000_000;

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

  it('revela Colores automáticamente 15 segundos después de la primera respuesta', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      let timeoutSnapshots = 0;
      const manager = new RoomManager(() => ({ onColorTimeout: () => timeoutSnapshots++ }));
      const first = manager.createRoom({
        gameId: 'colores',
        config: DEFAULT_COLORES_CONFIG,
        nick: 'Ana',
        now: NOW,
      });
      if (!first.ok) throw new Error(first.code);
      const second = manager.joinRoom({ roomCode: first.value.roomCode, nick: 'Beto', now: NOW });
      if (!second.ok) throw new Error(second.code);
      const started = manager.start({
        roomCode: first.value.roomCode,
        playerId: first.value.playerId,
        now: NOW,
      });
      expect(started.ok).toBe(true);

      const room = manager.getRoomByCode(first.value.roomCode);
      if (!room?.state || room.state.gameId !== 'colores' || !room.state.colors) {
        throw new Error('Colores no empezó');
      }
      const answer = colorQuestionById(room.state.colors.questionId).correctColors;
      const submitted = manager.applyAction({
        roomCode: room.code,
        playerId: first.value.playerId,
        clientActionId: 'first-color-answer',
        expectedVersion: room.state.version,
        action: { type: 'submitColors', colors: answer },
        now: NOW,
      });
      expect(submitted.ok).toBe(true);
      if (!room.state || room.state.gameId !== 'colores') throw new Error('estado incorrecto');
      expect(room.state.colors?.deadlineAt).toBe(NOW + COLOR_ANSWER_SECONDS * 1000);

      vi.advanceTimersByTime(COLOR_ANSWER_SECONDS * 1000);

      if (!room.state || room.state.gameId !== 'colores') throw new Error('estado incorrecto');
      expect(room.state.phase).toBe('reveal');
      expect(room.state.players.map((player) => player.score)).toEqual([1, 0]);
      expect(timeoutSnapshots).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
