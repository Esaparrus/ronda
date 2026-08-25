import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_BANDERAS_CONFIG,
  DEFAULT_COLORES_CONFIG,
  DEFAULT_CONFIG,
  DEFAULT_MUS_CONFIG,
  DEFAULT_MUSICAL_CONFIG,
  DEFAULT_ORDEN_CONFIG,
} from '@ronda/protocol';
import { colorQuestionById, musGetPlayerView } from '@ronda/engine';
import { RoomManager } from './room-manager.ts';
import { scheduleBotTurn, type BotDriverDeps } from './bot-driver.ts';
import { decideMusAction } from './bot-policy.ts';
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

  it('permite practicar Banderas contra un robot y activa la presión de 5 segundos', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      const manager = new RoomManager();
      const created = manager.createRoom({
        gameId: 'banderas',
        config: { ...DEFAULT_BANDERAS_CONFIG, rounds: 5, answerTimeSeconds: 20 },
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
        now: () => Date.now(),
      };
      scheduleBotTurn(deps, created.value.roomCode);
      vi.advanceTimersByTime(700);

      const state = manager.getRoomByCode(created.value.roomCode)?.state;
      if (!state || state.gameId !== 'banderas') throw new Error('estado incorrecto');
      expect(state.flags.submissions[bot.value.playerId]).toBeDefined();
      expect(state.flags.deadlineAt).toBe(NOW + 700 + 5_000);
      manager.closeByHost({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        now: Date.now(),
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('permite jugar Musical contra la IA', () => {
    vi.useFakeTimers();
    try {
      const manager = new RoomManager();
      const created = manager.createRoom({
        gameId: 'musical',
        config: DEFAULT_MUSICAL_CONFIG,
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

      const room = manager.getRoomByCode(created.value.roomCode);
      if (!room?.state || room.state.gameId !== 'musical') throw new Error('estado incorrecto');
      const selected = manager.applyAction({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        clientActionId: 'select-musical-track',
        expectedVersion: room.state.version,
        action: {
          type: 'musicSelectTrack',
          track: {
            id: 'track-1',
            title: 'La canción',
            artist: 'El artista',
            year: 2020,
            previewUrl: 'https://example.com/preview.m4a',
            artworkUrl: null,
            storeUrl: 'https://example.com/track',
          },
        },
        now: NOW,
      });
      if (!selected.ok) throw new Error('no se pudo seleccionar la canción');

      const clipStarted = manager.applyAction({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        clientActionId: 'start-musical-clip',
        expectedVersion: room.state?.version ?? -1,
        action: { type: 'musicStartClip' },
        now: NOW,
      });
      if (!clipStarted.ok) throw new Error('no se pudo iniciar el clip');

      const deps: BotDriverDeps = {
        io: { to: vi.fn() } as unknown as TypedIoServer,
        mgr: manager,
        now: () => NOW,
      };
      scheduleBotTurn(deps, created.value.roomCode);
      vi.advanceTimersByTime(4_999);
      expect(room.state?.phase).toBe('playing');
      expect(room.state?.buzzedPlayerId).toBeNull();
      vi.advanceTimersByTime(1);
      expect(room.state?.phase).toBe('playing');
      expect(room.state?.buzzedPlayerId).toBe(bot.value.playerId);
      vi.advanceTimersByTime(5_000);
      expect(room.state?.phase).toBe('reveal');
      expect(room.state?.roundResult?.winnerId).toBe(bot.value.playerId);
    } finally {
      vi.useRealTimers();
    }
  });

  it('permite probar Musical online con una IA que inicia, resuelve y responde', () => {
    vi.useFakeTimers();
    try {
      const manager = new RoomManager();
      const created = manager.createRoom({
        gameId: 'musical',
        config: { ...DEFAULT_MUSICAL_CONFIG, audioMode: 'online' },
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

      const room = manager.getRoomByCode(created.value.roomCode);
      if (!room?.state || room.state.gameId !== 'musical') throw new Error('estado incorrecto');
      const selected = manager.applyAction({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        clientActionId: 'select-online-track',
        expectedVersion: room.state.version,
        action: {
          type: 'musicSelectTrack',
          track: {
            id: 'online-track-1',
            title: 'La canción',
            artist: 'El artista',
            year: 2020,
            previewUrl: 'https://example.com/preview.m4a',
            artworkUrl: null,
            storeUrl: 'https://example.com/track',
          },
        },
        now: NOW,
      });
      if (!selected.ok) throw new Error('no se pudo seleccionar la canción');

      const deps: BotDriverDeps = {
        io: { to: vi.fn() } as unknown as TypedIoServer,
        mgr: manager,
        now: () => NOW,
      };
      scheduleBotTurn(deps, created.value.roomCode);
      vi.advanceTimersByTime(5_000);
      expect(
        room.state?.gameId === 'musical' &&
          room.state.players.find((p) => p.playerId === bot.value.playerId)?.onlineClipStartedAt,
      ).toBe(NOW);
      vi.advanceTimersByTime(5_000);
      expect(
        room.state?.gameId === 'musical' &&
          room.state.players.find((p) => p.playerId === bot.value.playerId)?.onlineClipResolvedAt,
      ).toBe(NOW);
      vi.advanceTimersByTime(5_000);
      expect(room.state?.phase).toBe('playing');
      if (!room.state || room.state.gameId !== 'musical') throw new Error('estado incorrecto');
      const humanStarted = manager.applyAction({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        clientActionId: 'human-start-online-track',
        expectedVersion: room.state.version,
        action: { type: 'musicStartClip' },
        now: NOW + 1_000,
      });
      if (!humanStarted.ok) throw new Error('la persona no pudo iniciar su audio');
      const humanResolved = manager.applyAction({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        clientActionId: 'human-resolve-online-track',
        expectedVersion: room.state.version,
        action: { type: 'musicResolveClip' },
        now: NOW + 5_000,
      });
      if (!humanResolved.ok) throw new Error('la persona no pudo detener su audio');
      const humanAnswered = manager.applyAction({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        clientActionId: 'human-answer-online-track',
        expectedVersion: room.state.version,
        action: {
          type: 'musicSubmitGuess',
          artist: 'El artista',
          title: 'La canción',
          year: 2020,
        },
        now: NOW + 5_100,
      });
      if (!humanAnswered.ok) throw new Error('la persona no pudo responder');
      expect(room.state?.phase).toBe('reveal');
      expect(room.state?.roundResult?.winnerId).toBe(bot.value.playerId);
    } finally {
      vi.useRealTimers();
    }
  });

  it('deja visible el resultado de Colores hasta que avance el anfitrión', () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
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
      if (!state || state.gameId !== 'colores' || !state.colors)
        throw new Error('estado incorrecto');
      const answer = colorQuestionById(state.colors.questionId).correctColors;
      const answered = manager.applyAction({
        roomCode: created.value.roomCode,
        playerId: created.value.playerId,
        clientActionId: 'human-color',
        expectedVersion: state.version,
        action: { type: 'submitColors', colors: answer },
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
      // Puede entregar el turno o cerrar si la mano generada ya lo permite;
      // en ambos casos ha reaccionado al timeout y no queda bloqueado.
      expect(manager.getRoomByCode(created.value.roomCode)?.state?.turnSeat).not.toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('permite jugar una mano completa de Mus con tres robots', () => {
    vi.useFakeTimers();
    try {
      const manager = new RoomManager();
      const created = manager.createRoom({
        gameId: 'mus',
        config: DEFAULT_MUS_CONFIG,
        nick: 'Ana',
        now: NOW,
      });
      if (!created.ok) throw new Error('no se pudo crear la sala');
      for (let i = 0; i < 3; i++) {
        const bot = manager.addBot({
          roomCode: created.value.roomCode,
          playerId: created.value.playerId,
          now: NOW,
        });
        if (!bot.ok) throw new Error('no se pudo añadir un robot de Mus');
      }
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
      const room = manager.getRoomByCode(created.value.roomCode);
      if (!room) throw new Error('sala no encontrada');

      // El anfitrión usa en el test la misma política conservadora. Los otros
      // tres asientos pasan necesariamente por el BotDriver y sus temporizadores.
      for (let step = 0; step < 100 && room.status === 'playing'; step++) {
        const state = room.state;
        if (!state || state.gameId !== 'mus' || state.turnSeat === null) {
          throw new Error('estado de Mus inválido');
        }
        const current = state.players[state.turnSeat];
        if (!current) throw new Error('turno sin jugador');
        const runtime = room.players.get(current.playerId);
        if (!runtime) throw new Error('jugador sin runtime');

        if (runtime.isBot) {
          scheduleBotTurn(deps, room.code);
          vi.advanceTimersByTime(700);
        } else {
          const action = decideMusAction(musGetPlayerView(state, current.playerId));
          if (!action) throw new Error('el bot de prueba no encontró una acción legal');
          const applied = manager.applyAction({
            roomCode: room.code,
            playerId: current.playerId,
            clientActionId: `human-${step}`,
            expectedVersion: state.version,
            action,
            now: NOW,
          });
          if (!applied.ok) throw new Error(`acción humana rechazada: ${applied.code}`);
        }
      }

      expect(room.status).toBe('roundEnd');
      expect(room.state?.status).toBe('roundEnd');

      // El humano confirma primero; después los tres robots confirman uno a
      // uno y dejan preparada la siguiente mano sin intervención adicional.
      const roundEnd = room.state;
      if (!roundEnd || roundEnd.gameId !== 'mus') throw new Error('sin fin de mano');
      expect(roundEnd.handResult).not.toBeNull();
      const confirmed = manager.applyAction({
        roomCode: room.code,
        playerId: created.value.playerId,
        clientActionId: 'human-next-round',
        expectedVersion: roundEnd.version,
        action: { type: 'nextRound' },
        now: NOW,
      });
      if (!confirmed.ok) throw new Error('el anfitrión no pudo confirmar');

      scheduleBotTurn(deps, room.code);
      // Avanzamos cada temporizador por separado: cada confirmación agenda la
      // siguiente dentro de su callback.
      for (let i = 0; i < 3; i++) vi.advanceTimersByTime(700);
      expect(room.status).toBe('playing');
      const nextHand = room.state;
      if (!nextHand || nextHand.gameId !== 'mus') throw new Error('sin siguiente mano de Mus');
      expect(nextHand.status).toBe('playing');
      expect(nextHand.phase).toBe('reparto');
    } finally {
      vi.useRealTimers();
    }
  });

  it('deja actuar al robot durante la consulta online aunque no haya turnSeat', () => {
    vi.useFakeTimers();
    try {
      const manager = new RoomManager();
      const created = manager.createRoom({
        gameId: 'mus',
        config: { ...DEFAULT_MUS_CONFIG, modo: 'online' },
        nick: 'Ana',
        now: NOW,
      });
      if (!created.ok) throw new Error('no se pudo crear la sala');
      for (let i = 0; i < 3; i++) {
        const bot = manager.addBot({
          roomCode: created.value.roomCode,
          playerId: created.value.playerId,
          now: NOW,
        });
        if (!bot.ok) throw new Error('no se pudo añadir un robot de Mus');
      }
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
      const room = manager.getRoomByCode(created.value.roomCode);
      if (!room?.state || room.state.gameId !== 'mus') throw new Error('estado incorrecto');

      // Primero reparte el bot que ocupa el postre; la consulta online empieza
      // justo después y deja de haber un turno individual.
      scheduleBotTurn(deps, room.code);
      vi.advanceTimersByTime(700);
      expect(room.state.turnSeat).toBeNull();
      expect(room.state.musConsultingTeam).toBe(0);
      expect(room.state.version).toBe(1);

      vi.advanceTimersByTime(700);
      expect(room.state.version).toBe(2);

      vi.advanceTimersByTime(700);
      if (!room.state || room.state.gameId !== 'mus') throw new Error('estado incorrecto');
      const partnerBot = room.state.players.find((player) => player.seat === 2);
      expect(room.state.version).toBe(3);
      expect(partnerBot?.musSaid).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
