// Gestión de presencia (conexión/desconexión) y tareas periódicas. Contrato §6 / P8.
//
// - Marca `connected` al conectar/desconectar y difunde `connection`.
// - Llama a maybeTransferHost() para traspasar anfitrión tras el grace.
// - Ejecuta sweep() cada 30s para cerrar salas caducadas.
import type { TypedIoServer } from '../io.ts';
import type { RoomManager } from '../rooms/room-manager.ts';
import { broadcastConnection, broadcastRoom } from './broadcast.ts';
import type { RateLimiter } from './rate-limit.ts';
import type { SocketState } from './handlers.ts';

const SWEEP_INTERVAL_MS = 30_000;

/**
 * Desconexión de un socket: marca al jugador desconectado, limpia el binding y
 * difunde el estado actualizado. Si es una pantalla, la retira.
 */
export function unbindSocket(
  io: TypedIoServer,
  mgr: RoomManager,
  bindings: Map<string, SocketState>,
  rateLimiter: RateLimiter,
  socketId: string,
  now: number,
): void {
  rateLimiter.forget(socketId);
  const binding = bindings.get(socketId);
  if (binding && binding.roomCode && binding.playerId) {
    mgr.setConnected({
      roomCode: binding.roomCode,
      playerId: binding.playerId,
      connected: false,
      socketId: null,
      now,
    });
    bindings.delete(socketId);
    const room = mgr.getRoomByCode(binding.roomCode);
    if (room) {
      broadcastConnection(io, room);
      broadcastRoom(io, room);
    }
  } else {
    // Podría ser una pantalla.
    mgr.detachScreen(socketId);
  }
}

/** Arranca el bucle de tareas periódicas: transferHost + sweep cada 30s. */
export function startPeriodicTasks(
  mgr: RoomManager,
  now: () => number,
): ReturnType<typeof setInterval> {
  return setInterval(() => {
    mgr.maybeTransferHost(now());
    mgr.sweep(now());
  }, SWEEP_INTERVAL_MS);
}
