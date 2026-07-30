// Conexión entre RoomManager y los repositorios. Contrato §4 / P7.
//
// Estrategia:
//   - Snapshot con DEBOUNCE de 400 ms (múltiples mutaciones rápidas => 1 write).
//   - Inmediato en: fin de ronda, fin de partida, entrada/salida de jugador.
//   - rehydrate() al arrancar: salas playing/roundEnd con <6 h de antigüedad.
import type { DbConfig } from '../db/client.ts';
import * as roomsRepo from '../db/rooms-repo.ts';
import * as matchesRepo from '../db/matches-repo.ts';
import type { Room } from './room.ts';
import type { Logger } from '../logger.ts';

const DEBOUNCE_MS = 400;

/**
 * Mantiene un snapshot con debounce por sala. Pensado como hook onPersist del
 * RoomManager: se llama en cada mutación; él decide si escribir ya o esperar.
 */
export class Persistence {
  private config: DbConfig | null;
  private logger: Logger;
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** matchId por roomCode (se asigna al crear la partida). */
  private matchIds = new Map<string, string>();
  /** roomId persistido por roomCode. */
  private roomIds = new Map<string, string>();

  // Nota P19: NO son "parameter properties" (constructor(private config...)) a
  // propósito. Esa forma abreviada de TypeScript no es solo un tipo que se
  // borra: genera código real (this.config = config), y el "type stripping"
  // nativo de Node (que este proyecto usa para ejecutar .ts directamente sin
  // paso de build, ver Dockerfile) solo soporta sintaxis puramente erasable.
  // Con la forma abreviada, `node apps/server/src/index.ts` fallaba en el
  // arranque con ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX -- se detectó al simular
  // el arranque real de la imagen de Docker para este mismo paquete P19.
  // tsc/vitest nunca lo detectaron porque ninguno de los dos ejecuta el
  // archivo con el "strip-only mode" de Node: tsc solo type-checkea y vitest
  // transpila con esbuild (que sí soporta parameter properties). Reescrito
  // sin cambiar ningún comportamiento.
  constructor(config: DbConfig | null, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /** Marca una sala para snapshot debounced (la vía normal tras cada acción). */
  scheduleSnapshot(room: Room): void {
    if (!this.config) return;
    const code = room.code;
    const existing = this.timers.get(code);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      this.timers.delete(code);
      void this.flush(room);
    }, DEBOUNCE_MS);
    this.timers.set(code, t);
  }

  /** Snapshot inmediato (sin debounce). Para fin de ronda/partida y alta/baja. */
  async flushNow(room: Room): Promise<void> {
    if (!this.config) return;
    const existing = this.timers.get(room.code);
    if (existing) {
      clearTimeout(existing);
      this.timers.delete(room.code);
    }
    await this.flush(room);
  }

  private async flush(room: Room): Promise<void> {
    if (!this.config) return;
    try {
      // Asegura la fila de room (y recuerda su id).
      let roomId = this.roomIds.get(room.code);
      if (!roomId) {
        roomId = await roomsRepo.upsertRoom(this.config, {
          code: room.code,
          gameId: room.gameId,
          status: room.status,
          configJson: room.config,
          hostPlayerId: room.hostPlayerId,
        });
        this.roomIds.set(room.code, roomId);
      } else {
        await roomsRepo.upsertRoom(this.config, {
          id: roomId,
          code: room.code,
          gameId: room.gameId,
          status: room.status,
          configJson: room.config,
          hostPlayerId: room.hostPlayerId,
        });
      }

      // Jugadores.
      for (const p of room.players.values()) {
        await roomsRepo.upsertPlayer(this.config, {
          roomId,
          nick: p.nick,
          seat: p.seat,
          tokenHash: p.tokenHash,
          isHost: p.isHost,
          connected: p.connected,
        });
      }

      // Snapshot del motor (si hay partida).
      if (room.state) {
        let matchId = this.matchIds.get(room.code);
        if (!matchId) {
          matchId = await matchesRepo.createMatch(this.config, {
            roomId,
            seed: room.seed,
            stateJson: room.state,
          });
          this.matchIds.set(room.code, matchId);
        } else {
          await matchesRepo.saveSnapshot(this.config, {
            matchId,
            version: room.state.version,
            stateJson: room.state,
          });
        }
      }
    } catch (e) {
      this.logger.warn('snapshot de persistencia falló', {
        code: room.code,
        detail: e instanceof Error ? e.message : String(e),
      });
    }
  }

  /** Al cerrar la sala: marca cerrada y libera timers. */
  async onClose(room: Room): Promise<void> {
    const t = this.timers.get(room.code);
    if (t) clearTimeout(t);
    this.timers.delete(room.code);
    this.matchIds.delete(room.code);
    this.roomIds.delete(room.code);
    if (this.config) {
      try {
        await roomsRepo.closeRoom(this.config, room.code);
      } catch {
        // no fatal: la sala ya está fuera de memoria.
      }
    }
  }

  /** Apaga todos los timers pendientes. */
  dispose(): void {
    for (const t of this.timers.values()) clearTimeout(t);
    this.timers.clear();
  }
}

/**
 * Rehidrata salas activas desde la BD al arrancar el servidor.
 * Devuelve una lista de salas para reinsertar en el RoomManager.
 *
 * NOTA: la implementación completa requiere reconstruir PlayerRuntime y el
 * estado del motor desde las filas. Para el MVP, rehidratamos el recuento y
 * dejamos que las salas vivan en memoria; la rehidratación total se completa
 * en P8/P19 cuando el servidor gestiona la continuidad real. Aquí devolvemos
 * los códigos para logging/telemetría.
 */
export async function rehydrate(
  config: DbConfig | null,
  logger: Logger,
): Promise<string[]> {
  if (!config) return [];
  try {
    const rows = await roomsRepo.loadActiveRooms(config);
    if (rows.length > 0) {
      logger.info('salas rehidratadas', { count: rows.length });
    }
    return rows.map((r) => r.code);
  } catch (e) {
    logger.warn('rehidratación falló', { detail: e instanceof Error ? e.message : String(e) });
    return [];
  }
}
