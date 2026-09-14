import { describe, expect, it, vi } from 'vitest';
import { waitForVersionChange } from './state-sync.ts';

type ViewHandler = (payload: { version: number }) => void;

function fakeSocket() {
  const handlers = new Set<ViewHandler>();
  return {
    socket: {
      on: (_event: 'state:view', handler: ViewHandler) => {
        handlers.add(handler);
        return undefined as never;
      },
      off: (_event: 'state:view', handler: ViewHandler) => {
        handlers.delete(handler);
        return undefined as never;
      },
    },
    emitVersion: (version: number) => {
      for (const handler of handlers) handler({ version });
    },
    listenerCount: () => handlers.size,
  };
}

describe('waitForVersionChange', () => {
  it('resuelve true y limpia el listener al llegar una versión nueva', async () => {
    const fake = fakeSocket();
    let version = 3;
    const waiting = waitForVersionChange(fake.socket, 3, () => version, 100);
    version = 4;
    fake.emitVersion(4);
    await expect(waiting).resolves.toBe(true);
    expect(fake.listenerCount()).toBe(0);
  });

  it('resuelve false por timeout en vez de esperar indefinidamente', async () => {
    vi.useFakeTimers();
    try {
      const fake = fakeSocket();
      const waiting = waitForVersionChange(fake.socket, 3, () => 3, 100);
      await vi.advanceTimersByTimeAsync(100);
      await expect(waiting).resolves.toBe(false);
      expect(fake.listenerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });
});
