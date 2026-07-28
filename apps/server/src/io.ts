// Inicialización de Socket.IO sobre el servidor HTTP. Contrato P5 / §2.3.
//
// Tipado con ClientToServerEvents / ServerToClientEvents de @ronda/protocol.
// Los manejadores reales llegan en P8; aquí solo montamos el servidor con la
// configuración de transporte (CORS, pings) y registramos conexiones/desconexiones
// a nivel log para verificar que arranca.
import { Server as IoServer, type Server as IoServerType } from 'socket.io';
import type { Server } from 'node:http';
import type { ClientToServerEvents, ServerToClientEvents } from '@ronda/protocol';
import type { ServerConfig } from './config.ts';
import type { Logger } from './logger.ts';

export type TypedIoServer = IoServerType<ClientToServerEvents, ServerToClientEvents>;

export interface IoDeps {
  server: Server;
  config: ServerConfig;
  logger: Logger;
}

/**
 * Crea el servidor Socket.IO con la configuración del contrato.
 * pingInterval 10s, pingTimeout 20s, CORS desde CORS_ORIGIN.
 */
export function createIoServer(deps: IoDeps): TypedIoServer {
  const io = new IoServer<ClientToServerEvents, ServerToClientEvents>(deps.server, {
    cors: {
      origin: deps.config.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 20000,
  });

  io.on('connection', (socket) => {
    deps.logger.debug('socket conectado', { id: socket.id });
    socket.on('disconnect', (reason) => {
      deps.logger.debug('socket desconectado', { id: socket.id, reason });
    });
    // P8 registrará aquí los manejadores de room:* y game:action.
  });

  return io;
}
