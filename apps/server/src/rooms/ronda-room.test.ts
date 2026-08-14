import { describe, expect, it } from 'vitest';
import { DEFAULT_LA_RONDA_CONFIG } from '@ronda/protocol';
import type { RondaState } from '@ronda/engine';
import { RoomManager } from './room-manager.ts';

const NOW = 1_000_000;

function startedRoom(nicks: string[]) {
  const manager = new RoomManager();
  const host = nicks[0];
  if (!host) throw new Error('falta anfitrión');
  const created = manager.createRoom({ gameId: 'laronda', config: DEFAULT_LA_RONDA_CONFIG, nick: host, now: NOW });
  if (!created.ok) throw new Error(created.code);
  const ids = new Map([[host, created.value.playerId]]);
  for (const nick of nicks.slice(1)) {
    const joined = manager.joinRoom({ roomCode: created.value.roomCode, nick, now: NOW });
    if (!joined.ok) throw new Error(joined.code);
    ids.set(nick, joined.value.playerId);
  }
  const started = manager.start({ roomCode: created.value.roomCode, playerId: created.value.playerId, now: NOW });
  if (!started.ok) throw new Error(started.code);
  return { manager, code: created.value.roomCode, ids };
}

function rondaState(manager: RoomManager, code: string): RondaState {
  const state = manager.getRoomByCode(code)?.state;
  if (!state || state.gameId !== 'laronda') throw new Error('sin estado de La Ronda');
  return state;
}

function idOf(ids: Map<string, string>, nick: string): string {
  const id = ids.get(nick);
  if (!id) throw new Error(`sin id para ${nick}`);
  return id;
}

describe('La Ronda en RoomManager', () => {
  it('saca a un respondedor de la cuenta sin bloquear el turno', () => {
    const { manager, code, ids } = startedRoom(['Ana', 'Beto', 'Carla', 'Diego']);
    const room = manager.getRoomByCode(code);
    if (!room) throw new Error('sin sala');
    const state = rondaState(manager, code);
    room.state = {
      ...state,
      phase: 'tips',
      turnSeat: 1,
      bill: {
        requesterSeat: 0,
        mode: 'solo',
        targetSeat: null,
        responderSeats: [1, 2, 3, 0],
        responderIndex: 0,
        passCount: 0,
        passedSeats: [],
        tipCardIds: [],
      },
    };

    const left = manager.leave({ roomCode: code, playerId: idOf(ids, 'Beto'), now: NOW });
    expect(left.ok).toBe(true);
    const next = rondaState(manager, code);
    expect(next.status).toBe('playing');
    expect(next.turnSeat).toBe(2);
    expect(next.bill?.responderSeats).toEqual([2, 3, 0]);
    expect(next.bill?.responderIndex).toBe(0);
  });

  it('con menos de tres personas termina y publica el ganador con más ahorro', () => {
    const { manager, code, ids } = startedRoom(['Ana', 'Beto', 'Carla']);
    const room = manager.getRoomByCode(code);
    if (!room) throw new Error('sin sala');
    const state = rondaState(manager, code);
    room.state = {
      ...state,
      players: state.players.map((player) => ({
        ...player,
        score: player.nick === 'Carla' ? 120_000 : player.nick === 'Beto' ? 200_000 : 80_000,
      })),
    };

    const left = manager.leave({ roomCode: code, playerId: idOf(ids, 'Beto'), now: NOW });
    expect(left.ok).toBe(true);
    const ended = rondaState(manager, code);
    expect(room.status).toBe('gameEnd');
    expect(ended.winnerId).toBe(idOf(ids, 'Carla'));
    expect(ended.winnerIds).toEqual([idOf(ids, 'Carla')]);
  });
});
