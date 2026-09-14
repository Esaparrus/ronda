-- Esquema inicial de Ronda. Contrato §4.
--
-- Solo el servidor accede, con una única cadena de conexión y permisos plenos.
-- Sin RLS: el rol anónimo no existe. Nunca se guardan datos personales más allá
-- del apodo.

create table rooms (
  id            uuid primary key,
  code          text not null unique,
  game_id       text not null,
  status        text not null,                  -- lobby | playing | roundEnd | gameEnd | closed
  config        jsonb not null,
  host_player_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  closed_at     timestamptz
);
create index rooms_status_updated_idx on rooms (status, updated_at desc);

create table players (
  id          uuid primary key,
  room_id     uuid not null references rooms(id) on delete cascade,
  nick        text not null,
  seat        int  not null,
  token_hash  text not null,                    -- sha256 hex del token
  is_host     boolean not null default false,
  connected   boolean not null default false,
  left_at     timestamptz,
  created_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (room_id, seat)
);
create index players_token_idx on players (token_hash);

create table matches (
  id          uuid primary key,
  room_id     uuid not null references rooms(id) on delete cascade,
  seed        text not null,
  version     int  not null default 0,
  state       jsonb not null,                   -- estado completo del motor
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  result      jsonb
);
create index matches_room_idx on matches (room_id, started_at desc);

create table match_events (
  id         bigserial primary key,
  match_id   uuid not null references matches(id) on delete cascade,
  version    int  not null,
  type       text not null,
  payload    jsonb not null,
  created_at timestamptz not null default now()
);
create index match_events_match_idx on match_events (match_id, version);

create table playtest_events (
  id         bigserial primary key,
  room_code  text,
  kind       text not null,                     -- room_created | player_joined | game_started |
                                                -- round_ended | game_ended | rematch | disconnect |
                                                -- reconnect | error
  payload    jsonb not null default '{}',
  created_at timestamptz not null default now()
);
