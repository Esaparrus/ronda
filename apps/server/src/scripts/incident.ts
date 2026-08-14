import { loadConfig } from '../config.ts';
import { closePool } from '../db/client.ts';
import {
  getIncident,
  INCIDENT_STATUSES,
  updateIncidentStatus,
  type IncidentStatus,
} from '../db/incidents-repo.ts';
import { createLogger } from '../logger.ts';

const config = loadConfig();
const logger = createLogger(config, { service: 'ronda-incident' });

async function main(): Promise<void> {
  const incidentId = process.argv[2]?.toUpperCase();
  if (!incidentId || !/^RND-[A-Z0-9]{8}$/.test(incidentId)) {
    throw new Error('uso: pnpm incident -- RND-A1B2C3D4 [new|investigating|fixed|ignored] [nota]');
  }

  const dbConfig = { connectionString: config.DATABASE_URL };
  const requestedStatus = process.argv[3] as IncidentStatus | undefined;
  if (requestedStatus) {
    if (!INCIDENT_STATUSES.includes(requestedStatus)) {
      throw new Error(`estado inválido: ${requestedStatus}`);
    }
    const updated = await updateIncidentStatus(
      dbConfig,
      incidentId,
      requestedStatus,
      process.argv.slice(4).join(' ').trim() || null,
    );
    if (!updated) throw new Error(`no se encontró el incidente ${incidentId}`);
  }

  const incident = await getIncident(dbConfig, incidentId);
  if (!incident) throw new Error(`no se encontró el incidente ${incidentId}`);

  logger.info('incidente encontrado', {
    incidentId,
    roomCode: incident.room_code,
    status: incident.status,
    fingerprint: incident.fingerprint,
    createdAt: incident.received_at,
    resolution: incident.resolution,
    report: incident.payload,
  });
}

main()
  .catch((error) => {
    logger.error('no se pudo leer el incidente', {
      detail: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(() => closePool());
