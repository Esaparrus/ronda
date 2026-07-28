// Arranque del servidor. Contrato P5.
//
// Lee la config, crea el logger, el servidor HTTP y Socket.IO, escucha en PORT.
// Apagado limpio con SIGTERM/SIGINT: cierra sockets, servidor HTTP y llama al
// hook de snapshot (que P7 rellenará para persistir el estado en memoria).
import { createHttpServer } from './http.ts';
import { createIoServer } from './io.ts';
import { createLogger } from './logger.ts';
import { loadConfig } from './config.ts';
import '@ronda/engine'; // registra los módulos de juego en GAMES (side effect).

/** Hook de snapshot al apagar. P7 lo rellena para persistir salas. Por ahora no-op. */
export type SnapshotHook = () => Promise<void>;

export interface ServerRuntime {
  close(): Promise<void>;
}

/**
 * Arranca el servidor con dependencias inyectadas (para tests).
 * En producción se llama sin argumentos: lee process.env.
 */
export async function startServer(opts: {
  config?: ReturnType<typeof loadConfig>;
  snapshotOnShutdown?: SnapshotHook;
  countRooms?: () => number;
}): Promise<ServerRuntime> {
  const config = opts.config ?? loadConfig();
  const logger = createLogger(config, { service: 'ronda-server' });
  const snapshot = opts.snapshotOnShutdown ?? (async () => undefined);

  const { server, startedAt } = createHttpServer({ countRooms: opts.countRooms });
  const io = createIoServer({ server, config, logger });

  await new Promise<void>((resolve) => {
    server.listen(config.PORT, () => resolve());
  });
  logger.info('servidor escuchando', { port: config.PORT, env: config.NODE_ENV });
  void startedAt;

  let closing = false;
  async function shutdown(signal: string): Promise<void> {
    if (closing) return;
    closing = true;
    logger.info('apagando', { signal });
    try {
      await snapshot();
    } catch (e) {
      logger.error('snapshot falló en shutdown', { detail: e instanceof Error ? e.message : String(e) });
    }
    io.close();
    server.close();
    // Dar un margen breve para que se vacíen los buffers antes de salir.
    setTimeout(() => process.exit(0), 200);
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  return {
    close: async () => {
      io.close();
      server.close();
    },
  };
}

// Arranque directo cuando se ejecuta como entrypoint (no en tests).
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
    // eslint-disable-next-line no-console
    console.error('fallo al arrancar:', e);
    process.exit(1);
  });
}
