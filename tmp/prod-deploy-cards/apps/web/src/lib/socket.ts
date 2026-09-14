// Cliente Socket.IO único de la app, tipado con @ronda/protocol. Contrato
// P12 / §2.3, §2.4.
//
// No conecta solo (`autoConnect: false`): quien primero necesite red (una
// acción del store) llama a `socket.connect()`. Reconexión exponencial
// 250ms -> 8s, tal cual pide el contrato.
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@ronda/protocol';
import { resolveServerUrl } from './server-url';
import { recordDiagnostic } from './diagnostic-recorder.ts';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/** Evita que un móvil se quede con un botón bloqueado si el servidor no responde. */
const ACK_TIMEOUT_MS = 12_000;

function serverUrl(): string {
  // Next puede prerenderizar rutas que importan el store, aunque el socket
  // solo se use en el navegador. Durante ese prerender no debemos exigir la
  // URL HTTPS final; la comprobación estricta se aplica al runtime publicado.
  const runtimeEnv = typeof window === 'undefined' ? 'development' : process.env.NODE_ENV;
  return resolveServerUrl(process.env.NEXT_PUBLIC_SERVER_URL, runtimeEnv);
}

let socketInstance: AppSocket | null = null;

function payloadSummary(
  event: keyof ClientToServerEvents,
  payload: unknown,
): Record<string, string | number | boolean | null> {
  const value = payload as Record<string, unknown>;
  if (event === 'game:action') {
    const action = value.action as Record<string, unknown> | undefined;
    const summary: Record<string, string | number | boolean | null> = {
      event,
      clientActionId: typeof value.clientActionId === 'string' ? value.clientActionId : null,
      expectedVersion: typeof value.expectedVersion === 'number' ? value.expectedVersion : null,
      actionType: typeof action?.type === 'string' ? action.type : 'unknown',
    };
    for (const key of ['cardId', 'amount', 'count', 'value', 'piedras', 'tiene'] as const) {
      const field = action?.[key];
      if (typeof field === 'string' || typeof field === 'number' || typeof field === 'boolean') {
        summary[key] = field;
      }
    }
    if (Array.isArray(action?.cardIds)) summary.cardCount = action.cardIds.length;
    if (Array.isArray(action?.order)) summary.cardCount = action.order.length;
    if (Array.isArray(action?.colors)) summary.choiceCount = action.colors.length;
    if (typeof action?.answer === 'string') summary.answerLength = action.answer.length;
    return summary;
  }
  if (event === 'room:create') {
    return { event, gameId: typeof value.gameId === 'string' ? value.gameId : null };
  }
  if (event === 'room:join' || event === 'screen:attach') {
    return { event, roomCode: typeof value.roomCode === 'string' ? value.roomCode : null };
  }
  if (event === 'room:config') {
    const patch = value.patch as Record<string, unknown> | undefined;
    return { event, fields: patch ? Object.keys(patch).sort().join(',').slice(0, 200) : '' };
  }
  if (event === 'diagnostic:report') return { event };
  return { event };
}

/**
 * Devuelve el socket único de la app, creándolo (sin conectar) la primera
 * vez que se pide. Llamadas posteriores devuelven siempre la misma
 * instancia: solo hay un socket por pestaña.
 */
export function getSocket(): AppSocket {
  if (!socketInstance) {
    socketInstance = io(serverUrl(), {
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 250,
      reconnectionDelayMax: 8000,
    }) as AppSocket;
  }
  return socketInstance;
}

/** Conecta el socket si todavía no lo está. Idempotente. */
export function connectIfNeeded(socket: AppSocket): void {
  if (!socket.connected) socket.connect();
}

/**
 * Emite un evento cliente→servidor con *acknowledgement* y lo devuelve como
 * promesa del `Result` tipado de ese evento. Todos los eventos del contrato
 * (§2.3) siguen este mismo patrón payload+ack, así que un único helper
 * genérico basta para todos ellos.
 */
export function emitWithAck<E extends keyof ClientToServerEvents>(
  socket: AppSocket,
  event: E,
  payload: Parameters<ClientToServerEvents[E]>[0],
): Promise<Parameters<Parameters<ClientToServerEvents[E]>[1]>[0]> {
  type Ack = Parameters<ClientToServerEvents[E]>[1];
  type AckResult = Parameters<Ack>[0];

  return new Promise<AckResult>((resolve) => {
    const startedAt = Date.now();
    const shouldRecord = event !== 'diagnostic:report';
    if (shouldRecord) recordDiagnostic('socket:emit', payloadSummary(event, payload));
    let settled = false;
    const timeout = setTimeout(() => {
      settled = true;
      if (shouldRecord) {
        recordDiagnostic('socket:ack_timeout', {
          event,
          elapsedMs: Date.now() - startedAt,
        });
      }
      resolve({ ok: false, code: 'INTERNAL' } as AckResult);
    }, ACK_TIMEOUT_MS);
    const ack = ((res: AckResult) => {
      if (settled) {
        if (shouldRecord) recordDiagnostic('socket:late_ack', { event });
        return;
      }
      settled = true;
      clearTimeout(timeout);
      if (shouldRecord) {
        const result = res as { ok: boolean; code?: string; value?: { version?: number } };
        recordDiagnostic('socket:ack', {
          event,
          ok: result.ok,
          code: result.code ?? null,
          version: result.value?.version ?? null,
          elapsedMs: Date.now() - startedAt,
        });
      }
      resolve(res);
    }) as Ack;
    // El despacho genérico por `E` impide que tsc correlacione el tipo
    // exacto de `payload`/`ack` con el overload concreto de `emit` (cada
    // evento tiene una firma distinta): el emisor público de arriba sigue
    // fuertemente tipado por evento gracias a `Parameters<...>`; solo esta
    // llamada interna necesita el cast para poder compilar.
    (socket.emit as unknown as (ev: E, p: unknown, a: unknown) => void)(event, payload, ack);
  });
}
