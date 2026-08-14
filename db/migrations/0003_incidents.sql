-- Buzón duradero de incidencias enviadas desde la bandera de ayuda.
--
-- Cada pulsación conserva su identificador RND propio. `fingerprint` permite
-- agrupar fallos equivalentes sin perder las ocurrencias individuales.
-- El payload ya llega validado y anonimizado por @ronda/protocol: no contiene
-- apodos, tokens, manos ni respuestas libres.

create table incidents (
  incident_id  text primary key check (incident_id ~ '^RND-[A-Z0-9]{8}$'),
  fingerprint  text not null,
  room_code    text,
  game_id      text,
  reason       text not null,
  status       text not null default 'new'
               check (status in ('new', 'investigating', 'fixed', 'ignored')),
  occurred_at  timestamptz not null,
  received_at  timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  release      text,
  path         text not null,
  payload      jsonb not null,
  resolution   text,
  resolved_at  timestamptz
);

create index incidents_status_seen_idx on incidents (status, last_seen_at desc);
create index incidents_fingerprint_seen_idx on incidents (fingerprint, last_seen_at desc);
create index incidents_room_idx on incidents (room_code, last_seen_at desc);
