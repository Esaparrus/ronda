// Repositorio de matches y eventos. Contrato §4 / P7.
import { randomUUID } from 'node:crypto';
import { query, type DbConfig } from './client.ts';
import type { GameEvent } from '@ronda/protocol';

/** Crea una partida nueva asociada a una sala. Devuelve su id. */
export async function createMatch(
  config: DbConfig,
  input: { roomId: string; seed: string; stateJson: unknown },
): Promise<string> {
  const id = randomUUID();
  await query(
    config,
    `insert into matches (id, room_id, seed, version, state)
     values ($1, $2, $3, $4, $5)`,
    [id, input.roomId, input.seed, 0, JSON.stringify(input.stateJson)],
  );
  return id;
}

/** Guarda un snapshot del estado (la verdad está en memoria; esto es respaldo). */
export async function saveSnapshot(
  config: DbConfig,
  input: { matchId: string; version: number; stateJson: unknown },
): Promise<void> {
  await query(
    config,
    'update matches set state = $1, version = $2 where id = $3',
    [JSON.stringify(input.stateJson), input.version, input.matchId],
  );
}

/** Añade eventos cosméticos asociados a una versión. */
export async function appendEvents(
  config: DbConfig,
  input: { matchId: string; version: number; events: GameEvent[] },
): Promise<void> {
  if (input.events.length === 0) return;
  // Inserción por lotes con unnest.
  const types = input.events.map((e) => e.t);
  const payloads = input.events.map((e) => JSON.stringify(e));
  await query(
    config,
    `insert into match_events (match_id, version, type, payload)
     select $1, $2, t, p::jsonb from unnest($3::text[], $4::text[]) as u(t, p)`,
    [input.matchId, input.version, types, payloads],
  );
}

/** Marca la partida como terminada con su resultado. */
export async function finishMatch(
  config: DbConfig,
  input: { matchId: string; resultJson: unknown },
): Promise<void> {
  await query(
    config,
    'update matches set ended_at = now(), result = $1 where id = $2',
    [JSON.stringify(input.resultJson), input.matchId],
  );
}
