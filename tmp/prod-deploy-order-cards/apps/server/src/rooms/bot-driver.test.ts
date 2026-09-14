import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_COLORES_CONFIG, DEFAULT_CONFIG, DEFAULT_ORDEN_CONFIG } from '@ronda/protocol';
import { RoomManager } from './room-manager.ts';
import { scheduleBotTurn, type BotDriverDeps } from './bot-driver.ts';
import type { TypedIoServer } from '../io.ts';

const NOW = 1_000_000;

describe('BotDriver', () => {
  it('continúa el turno del robot después de cada una de sus acciones', () => {
    vi.useFakeTimers();
    try {
      const manager = new RoomManager();
      const config = { ...DEFAULT_CONFIG, turnTimeSeconds: 0 as const };
      const created = manager.createRoom({
        gameId: 'chinchon',
        config,
        nick: 'Ana',
        now: NOW,
      });
      if (!created.ok) throw new Error('no se pudo crear la sala');
      const bot = manager.addBot({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        now: NOW,
      });
      if (!bot.ok) throw new Error('no se pudo añadir el robot');
      const started = manager.start({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        now: NOW,
      });
      if (!started.ok) throw new Error('no se pudo empezar la partida');

      const deps: BotDriverDeps = {
        io: { to: vi.fn() } as unknown as TypedIoServer,
        mgr: manager,
        now: () => NOW,
      };
      scheduleBotTurn(deps, created.value.roomCode);

      vi.advanceTimersByTime(700);
      const afterDraw = manager.getRoomByCode(created.value.roomCode)?.state;
      expect(afterDraw?.version).toBe(1);
      expect(afterDraw?.turnSeat).toBe(1);

      // `runBotTurn` debe volver a agendarse después de la primera acción: sin
      // esto el robot se queda con ocho cartas y la partida parece bloqueada.
      vi.advanceTimersByTime(700);
      const afterDiscard = manager.getRoomByCode(created.value.roomCode)?.state;
      expect(afterDiscard?.version).toBe(2);
      expect(afterDiscard?.turnSeat).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('permite practicar Orden contra un robot', () => {
    vi.useFakeTimers();
    try {
      const manager = new RoomManager();
      const created = manager.createRoom({
        gameId: 'orden',
        config: DEFAULT_ORDEN_CONFIG,
        nick: 'Ana',
        now: NOW,
      });
      if (!created.ok) throw new Error('no se pudo crear la sala');
      const bot = manager.addBot({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        now: NOW,
      });
      if (!bot.ok) throw new Error('no se pudo aÃ±adir el robot');
      const started = manager.start({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        now: NOW,
      });
      if (!started.ok) throw new Error('no se pudo empezar la partida');

      const deps: BotDriverDeps = {
        io: { to: vi.fn() } as unknown as TypedIoServer,
        mgr: manager,
        now: () => NOW,
      };
      scheduleBotTurn(deps, created.value.roomCode);
      vi.advanceTimersByTime(700);

      const state = manager.getRoomByCode(created.value.roomCode)?.state;
      expect(state?.gameId).toBe('orden');
      expect(state?.version).toBe(1);
      expect(state?.players.filter((player) => player.hand.length === 0)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('deja visible el resultado de Colores hasta que avance el anfitrión', () => {
    vi.useFakeTimers();
    try {
      const manager = new RoomManager();
      const created = manager.createRoom({
        gameId: 'colores',
        config: DEFAULT_COLORES_CONFIG,
        nick: 'Ana',
        now: NOW,
      });
      if (!created.ok) throw new Error('no se pudo crear la sala');
      const bot = manager.addBot({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        now: NOW,
      });
      if (!bot.ok) throw new Error('no se pudo añadir el robot');
      const started = manager.start({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        now: NOW,
      });
      if (!started.ok) throw new Error('no se pudo empezar la partida');

      const deps: BotDriverDeps = {
        io: { to: vi.fn() } as unknown as TypedIoServer,
        mgr: manager,
        now: () => NOW,
      };
      scheduleBotTurn(deps, created.value.roomCode);
      vi.advanceTimersByTime(700);

      const room = manager.getRoomByCode(created.value.roomCode);
      const state = room?.state;
      if (!state || state.gameId !== 'colores') throw new Error('estado incorrecto');
      const answered = manager.applyAction({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        clientActionId: 'human-color',
        expectedVersion: state.version,
        action: { type: 'submitColors', colors: ['rojo'] },
        now: NOW,
      });
      if (!answered.ok) throw new Error('no se pudo responder');
      const revealState = room.state;
      if (!revealState || revealState.gameId !== 'colores') throw new Error('estado incorrecto');
      expect(revealState.phase).toBe('reveal');
      const revealVersion = revealState.version;

      scheduleBotTurn(deps, created.value.roomCode);
      vi.advanceTimersByTime(5_000);
      const afterWait = room.state;
      if (!afterWait || afterWait.gameId !== 'colores') throw new Error('estado incorrecto');
      expect(afterWait.phase).toBe('reveal');
      expect(afterWait.version).toBe(revealVersion);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reactiva el robot cuando el timeout automático le entrega el turno', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const deps = {} as BotDriverDeps;
      const manager = new RoomManager(() => ({
        onTurnTimeout: (room) => scheduleBotTurn(deps, room.code),
      }));
      const config = { ...DEFAULT_CONFIG, turnTimeSeconds: 10 as const };
      const created = manager.createRoom({
        gameId: 'chinchon',
        config,
        nick: 'Ana',
        now: NOW,
      });
      if (!created.ok) throw new Error('no se pudo crear la sala');
      const bot = manager.addBot({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        now: NOW,
      });
      if (!bot.ok) throw new Error('no se pudo añadir el robot');
      const started = manager.start({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        now: NOW,
      });
      if (!started.ok) throw new Error('no se pudo empezar la partida');

      Object.assign(deps, {
        io: { to: vi.fn() } as unknown as TypedIoServer,
        mgr: manager,
        now: () => Date.now(),
      });

      // Primero dejamos que el robot complete su turno inicial y se lo entregue
      // al humano; así el timeout que probamos abajo es inequívocamente humano.
      scheduleBotTurn(deps, created.value.roomCode);
      vi.advanceTimersByTime(1_400);
      expect(manager.getRoomByCode(created.value.roomCode)?.state?.turnSeat).toBe(0);

      // El asiento humano agota su turno; el hook debe programar al robot.
      vi.advanceTimersByTime(10_000);
      const afterTimeout = manager.getRoomByCode(created.value.roomCode)?.state;
      expect(afterTimeout?.turnSeat).toBe(1);

      vi.advanceTimersByTime(700);
      expect(manager.getRoomByCode(created.value.roomCode)?.state?.turnSeat).toBe(1);
      vi.advanceTimersByTime(700);
      expect(manager.getRoomByCode(created.value.roomCode)?.state?.turnSeat).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
