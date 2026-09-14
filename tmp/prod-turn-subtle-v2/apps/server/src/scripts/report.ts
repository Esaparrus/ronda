// Informe de playtest: `pnpm report`. Contrato P18 / 00-MASTER.md §10.
//
// De las 7 métricas del §10, solo 4 se pueden calcular desde
// `playtest_events` con los 9 kinds del contrato (room_created,
// player_joined, game_started, round_ended, game_ended, rematch,
// disconnect, reconnect, error). Las otras 3 se listan igualmente, pero
// marcadas como no medibles desde aquí -- en vez de inventar un número o
// callarlas, cada una lleva el motivo exacto:
//   1) "tiempo QR -> dentro de la sala": el escaneo ocurre en el móvil,
//      antes de que exista ningún socket; no hay evento de servidor que lo
//      pueda marcar. Se cronometra a mano en playtest (ver PLAYTEST.md, P20).
//   5) "latencia acción -> estado nuevo" (p95): ningún kind del contrato
//      registra la ida y vuelta de un `game:action` concreto -- son marcas
//      de tiempo POR EVENTO, no por acción. Añadir un kind nuevo para esto
//      se salía del alcance de P18 (NO HAGAS: "no añadas funciones nuevas");
//      la lista de 9 kinds está cerrada por el propio prompt.
//   7) "preguntas ¿y ahora qué hago?": la cuenta un observador humano
//      durante la sesión de playtest (P20), no el servidor.
import { loadConfig } from '../config.ts';
import { query } from '../db/client.ts';
import { createLogger } from '../logger.ts';

interface Counts {
  rooms_created: string;
  rooms_started: string;
  rooms_ended: string;
  rooms_rematch: string;
  disconnects: string;
  reconnects: string;
}

/** Porcentaje con 1 decimal, o null si el denominador es 0 (sin datos). */
function pct(num: number, den: number): number | null {
  if (den === 0) return null;
  return Math.round((num / den) * 1000) / 10;
}

const config = loadConfig();
const logger = createLogger(config, { service: 'ronda-report' });

async function main(): Promise<void> {
  const dbConfig = { connectionString: config.DATABASE_URL };

  const { rows } = await query<Counts>(
    dbConfig,
    `select
      (select count(distinct room_code) from playtest_events where kind = 'room_created') as rooms_created,
      (select count(distinct room_code) from playtest_events where kind = 'game_started') as rooms_started,
      (select count(distinct room_code) from playtest_events where kind = 'game_ended')   as rooms_ended,
      (select count(distinct room_code) from playtest_events where kind = 'rematch')      as rooms_rematch,
      (select count(*) from playtest_events where kind = 'disconnect') as disconnects,
      (select count(*) from playtest_events where kind = 'reconnect')  as reconnects`,
  );
  const c = rows[0];
  const roomsCreated = Number(c?.rooms_created ?? 0);
  const roomsStarted = Number(c?.rooms_started ?? 0);
  const roomsEnded = Number(c?.rooms_ended ?? 0);
  const roomsRematch = Number(c?.rooms_rematch ?? 0);
  const disconnects = Number(c?.disconnects ?? 0);
  const reconnects = Number(c?.reconnects ?? 0);

  const startedPct = pct(roomsStarted, roomsCreated);
  const finishedPct = pct(roomsEnded, roomsStarted);
  const rematchPct = pct(roomsRematch, roomsEnded);
  const reconnectPct = pct(reconnects, disconnects);

  logger.info('--- Informe de playtest (00-MASTER.md §10) ---');

  logger.info('1. Tiempo escaneo QR -> dentro de la sala (objetivo: mediana < 15s)', {
    valor: 'no medible desde playtest_events',
    motivo:
      'el escaneo ocurre en el móvil antes de que exista un socket; cronometrar a mano (PLAYTEST.md)',
  });

  logger.info('2. Salas creadas que llegan a empezar partida (objetivo: > 80%)', {
    valor: startedPct === null ? 'sin datos' : `${startedPct}%`,
    rooms_created: roomsCreated,
    rooms_started: roomsStarted,
    cumple: startedPct === null ? null : startedPct > 80,
  });

  logger.info('3. Partidas empezadas que llegan al final (objetivo: > 70%)', {
    valor: finishedPct === null ? 'sin datos' : `${finishedPct}%`,
    rooms_started: roomsStarted,
    rooms_ended: roomsEnded,
    cumple: finishedPct === null ? null : finishedPct > 70,
  });

  logger.info('4. Grupos que piden revancha (objetivo: > 60%)', {
    valor: rematchPct === null ? 'sin datos' : `${rematchPct}%`,
    rooms_ended: roomsEnded,
    rooms_rematch: roomsRematch,
    cumple: rematchPct === null ? null : rematchPct > 60,
  });

  logger.info('5. Latencia acción -> estado nuevo en el móvil, p95 (objetivo: < 250ms)', {
    valor: 'no instrumentado en playtest_events',
    motivo: 'ningún kind del contrato registra la latencia de un game:action concreto',
  });

  logger.info('6. Reconexiones que recuperan la partida (objetivo: > 95%)', {
    valor: reconnectPct === null ? 'sin datos' : `${reconnectPct}%`,
    disconnects,
    reconnects,
    cumple: reconnectPct === null ? null : reconnectPct > 95,
    nota: 'proporción agregada disconnect/reconnect, no emparejada por sesión',
  });

  logger.info('7. Preguntas "¿y ahora qué hago?" por partida (objetivo: < 2)', {
    valor: 'métrica manual del observador en playtest',
    motivo: 'no es un evento que el servidor pueda ver; se recoge a mano (PLAYTEST.md)',
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    logger.error('report falló', { detail: e instanceof Error ? e.message : String(e) });
    process.exit(1);
  });
