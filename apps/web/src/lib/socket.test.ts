import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CONFIG, ok, type Result } from '@ronda/protocol';
import { emitWithAck, type AppSocket } from './socket.ts';

type CreateResult = Result<{
  roomCode: string;
  playerId: string;
  playerToken: string;
  seat: number;
}>;

class DelayedSocket {
  connected = false;
  connectCalls = 0;
  createCalls = 0;
  private connectListeners = new Set<() => void>();

  connect(): this {
    this.connectCalls += 1;
    return this;
  }

  once(event: string, listener: () => void): this {
    if (event === 'connect') this.connectListeners.add(listener);
    return this;
  }

  off(event: string, listener: () => void): this {
    if (event === 'connect') this.connectListeners.delete(listener);
    return this;
  }

  emit(event: string, _payload: unknown, ack: (result: CreateResult) => void): this {
    if (event === 'room:create') {
      this.createCalls += 1;
      ack(
        ok({
          roomCode: 'ABCD',
          playerId: 'p1',
          playerToken: 'token',
          seat: 0,
        }),
      );
    }
    return this;
  }

  establishConnection(): void {
    this.connected = true;
    const listeners = [...this.connectListeners];
    this.connectListeners.clear();
    for (const listener of listeners) listener();
  }
}

function createRoom(socket: DelayedSocket) {
  return emitWithAck(socket as unknown as AppSocket, 'room:create', {
    gameId: 'chinchon',
    config: DEFAULT_CONFIG,
    nick: 'Ana',
  });
}

afterEach(() => {
  vi.useRealTimers();
});

describe('emitWithAck', () => {
  it('no envía la acción hasta que el socket está conectado', async () => {
    const socket = new DelayedSocket();
    const result = createRoom(socket);

    await Promise.resolve();
    expect(socket.connectCalls).toBe(1);
    expect(socket.createCalls).toBe(0);

    socket.establishConnection();

    await expect(result).resolves.toMatchObject({ ok: true });
    expect(socket.createCalls).toBe(1);
  });

  it('no consume el timeout del ack mientras espera el arranque en frío', async () => {
    vi.useFakeTimers();
    const socket = new DelayedSocket();
    let resolved = false;
    const result = createRoom(socket).then((value) => {
      resolved = true;
      return value;
    });

    await vi.advanceTimersByTimeAsync(12_001);
    expect(resolved).toBe(false);
    expect(socket.createCalls).toBe(0);

    socket.establishConnection();
    await expect(result).resolves.toMatchObject({ ok: true });
  });

  it('abandona la espera de conexión sin dejar una acción encolada', async () => {
    vi.useFakeTimers();
    const socket = new DelayedSocket();
    const result = createRoom(socket);

    await vi.advanceTimersByTimeAsync(90_000);

    await expect(result).resolves.toEqual({ ok: false, code: 'INTERNAL' });
    expect(socket.createCalls).toBe(0);
  });
});
