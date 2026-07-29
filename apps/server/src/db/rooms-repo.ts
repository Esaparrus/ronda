// Repositorio de rooms/players. Contrato §4 / P7.
import { randomUUID } from 'node:crypto';
import { query, type DbConfig } from './client.ts';

export interface RoomRow {
  id: string;
  code: string;
  gameId: string;
  status: string;
  config: unknown;
  hostPlayerId: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface PlayerRow {
  id: string;
  roomId: string;
  nick: string;
  seat: number;
  tokenHash: string;
  isHost: boolean;
  connected: boolean;
  leftAt: string | null;
  createdAt: string;
  lastSeenAt: string;
}

/** Upsert de sala (insert o update por code). */
export async function upsertRoom(
  config: DbConfig,
  input: {
    id?: string;
    code: string;
    gameId: string;
    status: string;
    configJson: unknown;
    hostPlayerId?: string | null;
    closedAt?: string | null;
  },
): Promise<string> {
  const id = input.id ?? randomUUID();
  await query(
    config,
    `insert into rooms (id, code, game_id, status, config, host_player_id, closed_at, updated_at)
     values ($1, $2, $3, $4, $5, $6, $7, now())
     on conflict (code) do update set
       status = excluded.status,
       config = excluded.config,
       host_player_id = excluded.host_player_id,
       closed_at = excluded.closed_at,
       updated_at = now()`,
    [
      id,
      input.code,
      input.gameId,
      input.status,
      JSON.stringify(input.configJson),
      input.hostPlayerId ?? null,
      input.closedAt ?? null,
    ],
  );
  return id;
}

/** Upsert de jugador (insert o update por room_id+seat). */
export async function upsertPlayer(
  config: DbConfig,
  input: {
    id?: string;
    roomId: string;
    nick: string;
    seat: number;
    tokenHash: string;
    isHost: boolean;
    connected: boolean;
    leftAt?: string | null;
  },
): Promise<string> {
  const id = input.id ?? randomUUID();
  await query(
    config,
    `insert into players (id, room_id, nick, seat, token_hash, is_host, connected, left_at, last_seen_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, now())
     on conflict (room_id, seat) do update set
       nick = excluded.nick,
       token_hash = excluded.token_hash,
       is_host = excluded.is_host,
       connected = excluded.connected,
       left_at = excluded.left_at,
       last_seen_at = now()`,
    [id, input.roomId, input.nick, input.seat, input.tokenHash, input.isHost, input.connected, input.leftAt ?? null],
  );
  return id;
}

/** Busca un jugador por hash de token. */
export async function findPlayerByTokenHash(
  config: DbConfig,
  tokenHash: string,
): Promise<PlayerRow | null> {
  const res = await query<PlayerRow>(
    config,
    'select * from players where token_hash = $1 limit 1',
    [tokenHash],
  );
  return res.rows[0] ?? null;
}

/** Marca una sala como cerrada. */
export async function closeRoom(config: DbConfig, code: string): Promise<void> {
  await query(
    config,
    'update rooms set status = $1, closed_at = now(), updated_at = now() where code = $2',
    ['closed', code],
  );
}

/** Carga salas activas para rehidratar al arrancar. */
export async function loadActiveRooms(
  config: DbConfig,
): Promise<RoomRow[]> {
  const res = await query<RoomRow>(
    config,
    `select * from rooms
     where status in ('playing', 'roundEnd')
       and updated_at > now() - interval '6 hours'
     order by updated_at desc`,
  );
  return res.rows;
}
