// Tests de store.ts contra un servidor de Socket.IO falso (un `Server` real
// de la librería `socket.io`, en un puerto efímero, con handlers mínimos de
// juguete — no el servidor real de apps/server). Contrato P12, criterios de
// aceptación:
//   - reintento único ante STALE_VERSION
//   - no se envían dos acciones a la vez
//   - el token sobrevive a una recarga simulada
//   - `connection` refleja los tres estados
//
// Cada test crea su propio servidor efímero y reimporta socket.ts/store.ts
// en limpio (vi.resetModules) para no arrastrar el socket singleton de un
// test a otro.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createServer, type Server as HttpServer } from 'node:http';
import { Server as IoServer, type Socket as ServerSocket } from 'socket.io';
import { DEFAULT_CONFIG, err, ok, type PlayerView, type Result } from '@ronda/protocol';

class FakeStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) ?? null) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}
(globalThis as typeof globalThis & { localStorage: Storage }).localStorage = new FakeStorage();

function makeView(round: number): PlayerView {
  return {
    kind: 'player',
    roomCode: 'ABCD',
    gameId: 'chinchon',
    config: DEFAULT_CONFIG,
    status: 'playing',
    // El número de versión no forma parte de la vista (va aparte, en
    // StateViewPayload, contrato §2.4): se reutiliza `round` para que cada
    // llamada produzca una vista distinguible sin inventar otro campo.
    round,
    players: [],
    turnPlayerId: 'p1',
    turnPhase: 'discard',
    deckCount: 10,
    discardTop: null,
    discardCount: 0,
    roundResult: null,
    winnerId: null,
    rematchVotes: [],
    me: {
      playerId: 'p1',
      hand: [],
      bestMelds: [],
      deadwood: 0,
      canClose: false,
      closableDiscards: [],
      lockedCardId: null,
      availableActions: ['discard'],
    },
  } satisfies PlayerView;
}

interface FakeServer {
  httpServer: HttpServer;
  io: IoServer;
  port: number;
  actionCount: () => number;
}

/**
 * Servidor de Socket.IO de juguete: sabe responder room:create, room:resume
 * y game:action con el comportamiento que cada test necesita.
 */
function startFakeServer(opts: { staleOnFirstAction: boolean }): Promise<FakeServer> {
  return new Promise((resolve) => {
    const httpServer = createServer();
    const io = new IoServer(httpServer, { cors: { origin: '*' } });
    let actionCount = 0;
    const tokensByRoom = new Map<string, string>();
    let nextToken = 1;

    io.on('connection', (socket: ServerSocket) => {
      socket.on(
        'room:create',
        (
          _payload: unknown,
          ack: (
            res: Result<{ roomCode: string; playerId: string; playerToken: string; seat: number }>,
          ) => void,
        ) => {
          const roomCode = 'ABCD';
          const playerToken = `tok-${nextToken++}`;
          tokensByRoom.set(roomCode, playerToken);
          ack(ok({ roomCode, playerId: 'p1', playerToken, seat: 0 }));
          setTimeout(() => socket.emit('state:view', { version: 1, view: makeView(1) }), 0);
        },
      );

      socket.on(
        'room:resume',
        (
          payload: { playerToken: string },
          ack: (res: Result<{ roomCode: string; playerId: string; seat: number }>) => void,
        ) => {
          const found = Array.from(tokensByRoom.entries()).find(
            ([, tok]) => tok === payload.playerToken,
          );
          if (!found) {
            ack(err('INVALID_TOKEN'));
            return;
          }
          ack(ok({ roomCode: found[0], playerId: 'p1', seat: 0 }));
          setTimeout(() => socket.emit('state:view', { version: 1, view: makeView(1) }), 0);
        },
      );

      socket.on(
        'game:action',
        (_payload: unknown, ack: (res: Result<{ version: number }>) => void) => {
          actionCount += 1;
          if (opts.staleOnFirstAction && actionCount === 1) {
            ack(err('STALE_VERSION'));
            setTimeout(() => socket.emit('state:view', { version: 2, view: makeView(2) }), 0);
            return;
          }
          ack(ok({ version: actionCount + 1 }));
        },
      );
    });

    httpServer.listen(0, () => {
      const addr = httpServer.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ httpServer, io, port, actionCount: () => actionCount });
    });
  });
}

function stopFakeServer(server: FakeServer): Promise<void> {
  return new Promise((resolve) => {
    server.io.close();
    server.httpServer.close(() => resolve());
  });
}

const originalServerUrl = process.env.NEXT_PUBLIC_SERVER_URL;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  if (originalServerUrl === undefined) delete process.env.NEXT_PUBLIC_SERVER_URL;
  else process.env.NEXT_PUBLIC_SERVER_URL = originalServerUrl;
});

describe('store.ts', () => {
  it('sendAction reintenta UNA sola vez ante STALE_VERSION y luego para de bloquear', async () => {
    const server = await startFakeServer({ staleOnFirstAction: true });
    process.env.NEXT_PUBLIC_SERVER_URL = `http://localhost:${server.port}`;
    vi.resetModules();
    const { useRondaStore } = await import('./store.ts');

    const created = await useRondaStore.getState().createRoom('chinchon', DEFAULT_CONFIG, 'Ana');
    expect(created).toBe(true);

    await useRondaStore.getState().sendAction({ type: 'discard', cardId: 'oros-1' });

    expect(server.actionCount()).toBe(2); // 1 STALE_VERSION + 1 reintento, nunca un tercero
    expect(useRondaStore.getState().pendingAction).toBe(false);
    expect(useRondaStore.getState().lastError).toBeNull();

    useRondaStore.getState().leave();
    await stopFakeServer(server);
  }, 15000);

  it('no envía dos acciones a la vez: la segunda llamada se ignora mientras la primera está en vuelo', async () => {
    const server = await startFakeServer({ staleOnFirstAction: false });
    process.env.NEXT_PUBLIC_SERVER_URL = `http://localhost:${server.port}`;
    vi.resetModules();
    const { useRondaStore } = await import('./store.ts');

    await useRondaStore.getState().createRoom('chinchon', DEFAULT_CONFIG, 'Ana');

    const p1 = useRondaStore.getState().sendAction({ type: 'discard', cardId: 'oros-1' });
    const p2 = useRondaStore.getState().sendAction({ type: 'discard', cardId: 'oros-2' });
    await Promise.all([p1, p2]);

    expect(server.actionCount()).toBe(1);

    await stopFakeServer(server);
  }, 15000);

  it('el token sobrevive a una recarga simulada: resume() con el token guardado funciona tras reimportar los módulos', async () => {
    const server = await startFakeServer({ staleOnFirstAction: false });
    process.env.NEXT_PUBLIC_SERVER_URL = `http://localhost:${server.port}`;
    vi.resetModules();
    const first = await import('./store.ts');
    const created = await first.useRondaStore
      .getState()
      .createRoom('chinchon', DEFAULT_CONFIG, 'Ana');
    expect(created).toBe(true);
    const roomCode = first.useRondaStore.getState().roomCode;
    expect(roomCode).toBe('ABCD');

    // "Recarga": nuevo registro de módulos (nuevo socket, nuevo store), pero
    // el mismo localStorage de antes.
    vi.resetModules();
    const second = await import('./store.ts');
    expect(second.useRondaStore.getState().roomCode).toBeNull(); // estado en memoria, no persistido

    const resumed = await second.useRondaStore.getState().resume('ABCD');
    expect(resumed).toBe(true);
    expect(second.useRondaStore.getState().roomCode).toBe('ABCD');

    await stopFakeServer(server);
  }, 15000);

  it('connection refleja los tres estados: offline -> online -> reconnecting -> online', async () => {
    const server = await startFakeServer({ staleOnFirstAction: false });
    process.env.NEXT_PUBLIC_SERVER_URL = `http://localhost:${server.port}`;
    vi.resetModules();
    const { getSocket, connectIfNeeded } = await import('./socket.ts');
    const { useRondaStore } = await import('./store.ts');

    expect(useRondaStore.getState().connection).toBe('offline');

    const socket = getSocket();
    connectIfNeeded(socket);

    await vi.waitFor(
      () => {
        if (useRondaStore.getState().connection !== 'online') throw new Error('todavía no online');
      },
      { timeout: 3000, interval: 20 },
    );

    // Corta el transporte de bajo nivel (no un disconnect() nuestro): simula
    // una caída de red involuntaria. socket.io debe reconectar solo.
    (socket.io as unknown as { engine: { close: () => void } }).engine.close();

    await vi.waitFor(
      () => {
        if (useRondaStore.getState().connection !== 'reconnecting') {
          throw new Error('todavía no reconnecting');
        }
      },
      { timeout: 2000, interval: 20 },
    );

    await vi.waitFor(
      () => {
        if (useRondaStore.getState().connection !== 'online')
          throw new Error('no ha vuelto a online');
      },
      { timeout: 5000, interval: 20 },
    );

    socket.disconnect();
    await stopFakeServer(server);
  }, 20000);
});
