// Cliente Socket.IO único de la app, tipado con @ronda/protocol. Contrato
// P12 / §2.3, §2.4.
//
// No conecta solo (`autoConnect: false`): quien primero necesite red (una
// acción del store) llama a `socket.connect()`. Reconexión exponencial
// 250ms -> 8s, tal cual pide el contrato.
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@ronda/protocol';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const DEFAULT_SERVER_URL = 'http://localhost:8787';

function serverUrl(): string {
  return process.env.NEXT_PUBLIC_SERVER_URL ?? DEFAULT_SERVER_URL;
}

let socketInstance: AppSocket | null = null;

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
    const ack = ((res: AckResult) => resolve(res)) as Ack;
    // El despacho genérico por `E` impide que tsc correlacione el tipo
    // exacto de `payload`/`ack` con el overload concreto de `emit` (cada
    // evento tiene una firma distinta): el emisor público de arriba sigue
    // fuertemente tipado por evento gracias a `Parameters<...>`; solo esta
    // llamada interna necesita el cast para poder compilar.
    (socket.emit as unknown as (ev: E, p: unknown, a: unknown) => void)(event, payload, ack);
  });
}
