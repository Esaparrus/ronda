// Arranque del servidor. Contrato P5 / P6 / P7 / P8.
//
// Lee la config, crea el logger, el RoomManager (con hooks de difusión y
// persistencia), el servidor HTTP y Socket.IO, escucha en PORT.
// Apagado limpio con SIGTERM/SIGINT.
import { createHttpServer } from './http.ts';
import { createIoServer } from './io.ts';
import { createLogger } from './logger.ts';
import { loadConfig, type ServerConfig } from './config.ts';
import { RoomManager } from './rooms/room-manager.ts';
import { Persistence } from './rooms/persistence.ts';
import { broadcastRoom } from './socket/broadcast.ts';
import '@ronda/engine'; // registra los módulos de juego en GAMES (side effect).

export type SnapshotHook = () => Promise<void>;

export interface ServerRuntime {
  close(): Promise<void>;
}

/**
 * Arranca el servidor con dependencias inyectadas (para tests).
 */
export async function startServer(opts: {
  config?: ServerConfig;
  snapshotOnShutdown?: SnapshotHook;
}): Promise<ServerRuntime> {
  const config = opts.config ?? loadConfig();
  const logger = createLogger(config, { service: 'ronda-server' });
  const snapshot = opts.snapshotOnShutdown ?? (async () => undefined);

  // Persistencia (null si no hay BD disponible en tests).
  const dbConfig = { connectionString: config.DATABASE_URL };
  const persistence = new Persistence(dbConfig, logger);

  // RoomManager con hooks que difunden snapshots y persisten.
  const manager = new RoomManager(() => ({
    onSnapshot: (room) => {
      // La difusión la dispara el handler tras applyAction; aquí solo agendamos
      // persistencia. (El handler llama a broadcastRoom explícitamente.)
      persistence.scheduleSnapshot(room);
    },
    onEvent: (room, events, version) => {
      // La difusión de eventos la gestiona el handler vía RoomManager.applyAction
      // que ya emitió onSnapshot; los eventos cosméticos se difunden aquí.
      void events;
      void version;
      void room;
    },
    onToast: (room, level, text) => {
      // El toast se difunde cuando el io esté disponible; lo aplazamos.
      void room;
      void level;
      void text;
    },
    onClosed: (room, reason) => {
      void persistence.onClose(room);
      void reason;
    },
    onPersist: (room) => {
      void persistence.flushNow(room);
    },
    onTrack: (_room, _kind, _payload) => {
      // Telemetría: P18 la engancha a playtest-repo.
    },
  }));

  const { server } = createHttpServer({ countRooms: () => manager.countRooms() });
  const { io, stopPeriodic } = createIoServer({ server, config, logger, manager });
  // El manager puede usar io para difundir toasts/closed desde sus hooks.
  manager.setIo(io);

  await new Promise<void>((resolve) => {
    server.listen(config.PORT, () => resolve());
  });
  logger.info('servidor escuchando', { port: config.PORT, env: config.NODE_ENV });

  let closing = false;
  async function shutdown(signal: string): Promise<void> {
    if (closing) return;
    closing = true;
    logger.info('apagando', { signal });
    stopPeriodic?.();
    try {
      await snapshot();
    } catch (e) {
      logger.error('snapshot falló en shutdown', { detail: e instanceof Error ? e.message : String(e) });
    }
    io.close();
    server.close();
    setTimeout(() => process.exit(0), 200);
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return {
    close: async () => {
      stopPeriodic?.();
      io.close();
      server.close();
    },
  };
}

// Reexporta broadcast para que otros módulos lo tengan a mano.
export { broadcastRoom };

// Arranque directo como entrypoint.
import { fileURLToPath } from 'node:url';
import { argv } from 'node:process';
const isMain = (() => {
  try {
    return process.argv[1] && fileURLToPath(new URL(`file://${argv[1]}`)) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (isMain) {
  void startServer({}).catch((e) => {
    // eslint-disable-next-line no-console -- fallo crítico al arrancar
    console.error('fallo al arrancar:', e);
    process.exit(1);
  });
}
