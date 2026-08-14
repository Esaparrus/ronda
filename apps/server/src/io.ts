// Inicialización de Socket.IO sobre el servidor HTTP. Contrato P5 / P8 / §2.3.
//
// Tipado con ClientToServerEvents / ServerToClientEvents de @ronda/protocol.
// Si se inyecta un RoomManager (P8), registra handlers y presencia en cada
// conexión. Si no (P5 smoke), solo loguea conexiones.
import { Server as IoServer } from 'socket.io';
import type { Server } from 'node:http';
import type { ClientToServerEvents, ServerToClientEvents } from '@ronda/protocol';
import type { ServerConfig } from './config.ts';
import type { Logger } from './logger.ts';
import type { RoomManager } from './rooms/room-manager.ts';
import { RateLimiter } from './socket/rate-limit.ts';
import { registerHandlers, type SocketState } from './socket/handlers.ts';
import { unbindSocket, startPeriodicTasks } from './socket/presence.ts';

export type TypedIoServer = IoServer<ClientToServerEvents, ServerToClientEvents>;

export interface IoDeps {
  server: Server;
  config: ServerConfig;
  logger: Logger;
  /** Si se pasa, se registran handlers y presencia completos (P8). */
  manager?: RoomManager;
}

export interface IoRuntime {
  io: TypedIoServer;
  states: Map<string, SocketState>;
  rateLimiter: RateLimiter;
  stopPeriodic?: () => void;
}

/** Crea el servidor Socket.IO. Con manager, registra handlers reales. */
export function createIoServer(deps: IoDeps): IoRuntime {
  const io = new IoServer<ClientToServerEvents, ServerToClientEvents>(deps.server, {
    cors: {
      origin: deps.config.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 20000,
  });

  const states = new Map<string, SocketState>();
  const rateLimiter = new RateLimiter();

  io.on('connection', (socket) => {
    deps.logger.debug('socket conectado', { id: socket.id });

    if (deps.manager) {
      registerHandlers(socket, {
        io,
        mgr: deps.manager,
        rateLimiter,
        states,
        now: () => Date.now(),
      });
      socket.on('disconnect', (reason) => {
        deps.logger.debug('socket desconectado', { id: socket.id, reason });
        const mgr = deps.manager;
        if (mgr) unbindSocket(io, mgr, states, rateLimiter, socket.id, Date.now());
        states.delete(socket.id);
      });
    } else {
      socket.on('disconnect', (reason) => {
        deps.logger.debug('socket desconectado', { id: socket.id, reason });
      });
    }
  });

  let stopPeriodic: (() => void) | undefined;
  if (deps.manager) {
    stopPeriodic = startPeriodicTasks(deps.manager, () => Date.now());
  }

  return { io, states, rateLimiter, stopPeriodic };
}
