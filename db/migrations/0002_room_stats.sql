-- Estadísticas del grupo por sala. Roadmap "Después del MVP" §3 de
-- 02-PAQUETES.md ("Estadísticas del grupo, guardadas por sala").
--
-- La fuente de verdad en caliente es la memoria del servidor (Room.stats):
-- una sala vive en un único proceso y sus estadísticas mueren con ella. Esta
-- tabla es la copia duradera, escrita al terminar cada partida, para que
-- `pnpm report` y el análisis de playtest puedan mirar atrás.
--
-- Clave por `room_code` (no por rooms.id) igual que playtest_events: el hook
-- que la escribe se dispara desde RoomManager, que conoce el código de sala
-- pero no el uuid que la persistencia asigna a la fila de rooms.
--
-- Sin datos personales más allá del apodo, como el resto del esquema (§4).

create table room_stats (
  room_code   text not null,
  player_id   uuid not null,
  nick        text not null,
  seat        int  not null,
  matches     int  not null default 0,        -- partidas terminadas jugadas
  wins        int  not null default 0,
  rounds      int  not null default 0,        -- rondas jugadas en total
  total_score int  not null default 0,        -- suma de puntuaciones finales
  best_score  int,                            -- mejor según el juego (Chinchón: mínima; Pocha: máxima)
  worst_score int,
  updated_at  timestamptz not null default now(),
  primary key (room_code, player_id)
);
create index room_stats_room_idx on room_stats (room_code);
