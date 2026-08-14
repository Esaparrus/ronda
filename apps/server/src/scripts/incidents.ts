/* eslint-disable no-console -- CLI interactiva: su salida es el informe solicitado. */
import { loadConfig } from '../config.ts';
import { closePool } from '../db/client.ts';
import {
  INCIDENT_STATUSES,
  listIncidentGroups,
  type IncidentStatus,
} from '../db/incidents-repo.ts';

function parseArgs(args: string[]): { status?: IncidentStatus; limit: number; json: boolean } {
  let status: IncidentStatus | undefined = 'new';
  let limit = 20;
  let json = false;

  for (let index = 0; index < args.length; index++) {
    const value = args[index];
    if (value === '--all') status = undefined;
    else if (value === '--json') json = true;
    else if (value === '--status') {
      const candidate = args[++index];
      if (!INCIDENT_STATUSES.includes(candidate as IncidentStatus)) {
        throw new Error(`estado inválido: ${candidate ?? ''}`);
      }
      status = candidate as IncidentStatus;
    } else if (value === '--limit') {
      const candidate = Number(args[++index]);
      if (!Number.isInteger(candidate) || candidate < 1 || candidate > 100) {
        throw new Error('--limit debe estar entre 1 y 100');
      }
      limit = candidate;
    } else {
      throw new Error(`argumento desconocido: ${value}`);
    }
  }
  return { status, limit, json };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const config = loadConfig();
  const rows = await listIncidentGroups(
    { connectionString: config.DATABASE_URL },
    { status: options.status, limit: options.limit },
  );

  if (options.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  if (rows.length === 0) {
    console.log('No hay incidencias con ese filtro.');
    return;
  }
  console.table(
    rows.map((row) => ({
      código: row.latest_incident_id,
      estado: row.status,
      repeticiones: row.occurrences,
      juego: row.game_id ?? '—',
      motivo: row.reason,
      fase: row.client_phase ?? '—',
      error: row.error_message?.slice(0, 80) ?? '—',
      última: row.last_seen_at.toISOString(),
    })),
  );
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(() => closePool());
