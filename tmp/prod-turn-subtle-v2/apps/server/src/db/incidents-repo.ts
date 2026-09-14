import { createHash } from 'node:crypto';
import { query, type DbConfig } from './client.ts';

export const INCIDENT_STATUSES = ['new', 'investigating', 'fixed', 'ignored'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export interface IncidentInput {
  incidentId: string;
  roomCode: string;
  gameId: string;
  reason: string;
  occurredAt: number;
  receivedAt: number;
  release: string | null;
  path: string;
  clientStatus: string | null;
  clientPhase: string | null;
  pendingAction: boolean;
  errorName: string | null;
  errorMessage: string | null;
  payload: Record<string, unknown>;
}

export interface IncidentRow {
  incident_id: string;
  fingerprint: string;
  room_code: string | null;
  game_id: string | null;
  reason: string;
  status: IncidentStatus;
  occurred_at: Date;
  received_at: Date;
  last_seen_at: Date;
  release: string | null;
  path: string;
  payload: Record<string, unknown>;
  resolution: string | null;
  resolved_at: Date | null;
}

export interface IncidentGroupRow {
  fingerprint: string;
  status: IncidentStatus;
  occurrences: number;
  latest_incident_id: string;
  game_id: string | null;
  reason: string;
  client_phase: string | null;
  error_message: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
}

/**
 * Firma estable para juntar el mismo fallo aunque ocurra en otra sala.
 * Se eliminan códigos de sala, UUID y números variables del mensaje.
 */
export function incidentFingerprint(input: IncidentInput): string {
  const normalizedPath = input.path.replace(/\/sala\/[A-Z0-9-]+/gi, '/sala/:room');
  const normalizedError = (input.errorMessage ?? '')
    .toLowerCase()
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':uuid')
    .replace(/\b\d+\b/g, ':n')
    .slice(0, 300);
  const signature = JSON.stringify([
    input.gameId,
    input.reason,
    normalizedPath,
    input.clientStatus,
    input.clientPhase,
    input.pendingAction,
    input.errorName,
    normalizedError,
  ]);
  return createHash('sha256').update(signature).digest('hex').slice(0, 24);
}

/** Guarda una incidencia. Lanza si PostgreSQL no confirma la escritura. */
export async function saveIncident(config: DbConfig, input: IncidentInput): Promise<void> {
  const fingerprint = incidentFingerprint(input);
  await query(
    config,
    `insert into incidents (
       incident_id, fingerprint, room_code, game_id, reason, occurred_at,
       received_at, last_seen_at, release, path, payload
     ) values ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10)
     on conflict (incident_id) do update set
       last_seen_at = excluded.last_seen_at,
       payload = excluded.payload`,
    [
      input.incidentId,
      fingerprint,
      input.roomCode,
      input.gameId,
      input.reason,
      new Date(input.occurredAt),
      new Date(input.receivedAt),
      input.release,
      input.path,
      JSON.stringify(input.payload),
    ],
  );
}

export async function getIncident(
  config: DbConfig,
  incidentId: string,
): Promise<IncidentRow | null> {
  const result = await query<IncidentRow>(
    config,
    `select incident_id, fingerprint, room_code, game_id, reason, status,
            occurred_at, received_at, last_seen_at, release, path, payload,
            resolution, resolved_at
       from incidents
      where incident_id = $1`,
    [incidentId],
  );
  return result.rows[0] ?? null;
}

export async function listIncidentGroups(
  config: DbConfig,
  options: { status?: IncidentStatus; limit?: number } = {},
): Promise<IncidentGroupRow[]> {
  const limit = Math.max(1, Math.min(options.limit ?? 20, 100));
  const result = await query<IncidentGroupRow>(
    config,
    `with ranked as (
       select fingerprint,
              status,
              count(*) over (partition by fingerprint, status)::int as occurrences,
              incident_id as latest_incident_id,
              game_id,
              reason,
              payload #>> '{client,phase}' as client_phase,
              payload #>> '{error,message}' as error_message,
              min(occurred_at) over (partition by fingerprint, status) as first_seen_at,
              max(last_seen_at) over (partition by fingerprint, status) as last_seen_at,
              row_number() over (
                partition by fingerprint, status order by last_seen_at desc
              ) as position
         from incidents
        where ($1::text is null or status = $1)
     )
     select fingerprint, status, occurrences, latest_incident_id, game_id,
            reason, client_phase, error_message, first_seen_at, last_seen_at
       from ranked
      where position = 1
      order by last_seen_at desc
      limit $2`,
    [options.status ?? null, limit],
  );
  return result.rows;
}

export async function updateIncidentStatus(
  config: DbConfig,
  incidentId: string,
  status: IncidentStatus,
  resolution: string | null = null,
): Promise<boolean> {
  const result = await query(
    config,
    `update incidents
        set status = $2,
            resolution = coalesce($3, resolution),
            resolved_at = case when $2 in ('fixed', 'ignored') then now() else null end
      where incident_id = $1`,
    [incidentId, status, resolution],
  );
  return (result.rowCount ?? 0) > 0;
}
