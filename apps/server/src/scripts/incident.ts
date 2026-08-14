import { loadConfig } from '../config.ts';
import { query } from '../db/client.ts';
import { createLogger } from '../logger.ts';

interface IncidentRow {
  room_code: string | null;
  created_at: Date | string;
  payload: Record<string, unknown>;
}

const config = loadConfig();
const logger = createLogger(config, { service: 'ronda-incident' });

async function main(): Promise<void> {
  const incidentId = process.argv[2]?.toUpperCase();
  if (!incidentId || !/^RND-[A-Z0-9]{8}$/.test(incidentId)) {
    throw new Error('uso: pnpm incident -- RND-A1B2C3D4');
  }

  const { rows } = await query<IncidentRow>(
    { connectionString: config.DATABASE_URL },
    `select room_code, created_at, payload
       from playtest_events
      where kind = 'error' and payload ->> 'incidentId' = $1
      order by created_at desc
      limit 1`,
    [incidentId],
  );
  const incident = rows[0];
  if (!incident) throw new Error(`no se encontró el incidente ${incidentId}`);

  logger.info('incidente encontrado', {
    incidentId,
    roomCode: incident.room_code,
    createdAt: incident.created_at,
    report: incident.payload,
  });
}

main().catch((error) => {
  logger.error('no se pudo leer el incidente', {
    detail: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
