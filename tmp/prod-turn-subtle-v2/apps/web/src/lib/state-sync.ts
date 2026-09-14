export const STATE_SYNC_TIMEOUT_MS = 5_000;

interface StateViewSocket {
  on(event: 'state:view', handler: (payload: { version: number }) => void): unknown;
  off(event: 'state:view', handler: (payload: { version: number }) => void): unknown;
}

/** Espera una versión distinta sin dejar listeners ni promesas eternas. */
export function waitForVersionChange(
  socket: StateViewSocket,
  previousVersion: number,
  currentVersion: () => number,
  timeoutMs = STATE_SYNC_TIMEOUT_MS,
): Promise<boolean> {
  if (currentVersion() !== previousVersion) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const finish = (changed: boolean) => {
      if (settled) return;
      settled = true;
      globalThis.clearTimeout(timeout);
      socket.off('state:view', onView);
      resolve(changed);
    };
    const onView = (payload: { version: number }) => {
      if (payload.version !== previousVersion) finish(true);
    };
    const timeout = globalThis.setTimeout(() => finish(false), timeoutMs);
    socket.on('state:view', onView);
    // Cierra la carrera entre la comprobación inicial y el alta del listener.
    if (currentVersion() !== previousVersion) finish(true);
  });
}
