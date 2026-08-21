// Gestión de presencia (conexión/desconexión) y tareas periódicas. Contrato §6 / P8.
//
// - Marca `connected` al conectar/desconectar y difunde `connection`.
// - Llama a maybeTransferHost() para traspasar anfitrión tras el grace.
// - Vigila cada segundo los turnos vencidos y ejecuta sweep() cada 30s.
import type { TypedIoServer } from '../io.ts';
import type { RoomManager } from '../rooms/room-manager.ts';
import { broadcastConnection, broadcastRoom } from './broadcast.ts';
import type { RateLimiter } from './rate-limit.ts';
import type { SocketState } from './handlers.ts';

const SWEEP_INTERVAL_MS = 30_000;
const TURN_WATCHDOG_INTERVAL_MS = 1_000;

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
      // Telemetría P18. Solo se llega aquí para desconexiones reales (caída
      // de red, cierre de pestaña, o el disconnect(true) forzado de una
      // expulsión, P17): un `room:leave` normal borra el binding ANTES de
      // que este handler se ejecute (ver el handler de 'room:leave'), así
      // que nunca cuenta como "desconexión" de cara a la métrica de
      // reconexión de 00-MASTER.md §10.
      room.hooks.onTrack?.(room, 'disconnect', { playerId: binding.playerId });
    }
  } else {
    // Podría ser una pantalla.
    mgr.detachScreen(socketId);
  }
}

/** Arranca los bucles de presencia/caducidad y respaldo del reloj de turno. */
export function startPeriodicTasks(mgr: RoomManager, now: () => number): () => void {
  const sweepHandle = setInterval(() => {
    mgr.maybeTransferHost(now());
    mgr.sweep(now());
  }, SWEEP_INTERVAL_MS);
  const turnHandle = setInterval(() => {
    mgr.expireOverdueTurns(now());
    mgr.expireOverdueColorAnswers(now());
    mgr.expireOverdueScaleAnswers(now());
  }, TURN_WATCHDOG_INTERVAL_MS);

  return () => {
    clearInterval(sweepHandle);
    clearInterval(turnHandle);
  };
}
