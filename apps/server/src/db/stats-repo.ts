// Repositorio de estadísticas de sala. Contrato §4 / roadmap "Después del
// MVP" §3.
//
// Igual que playtest-repo.ts: NUNCA lanza. Las estadísticas son un extra
// social; un Postgres caído no puede tumbar una partida en curso. La copia
// viva sigue estando en memoria (Room.stats), así que un fallo de escritura
// solo cuesta el histórico, no lo que el grupo ve en pantalla.
import { query, type DbConfig } from './client.ts';
import type { RoomStatsRow } from '@ronda/protocol';

/** Guarda (upsert) las filas de estadísticas de una sala. No lanza nunca. */
export async function saveRoomStats(
  config: DbConfig | null,
  roomCode: string,
  rows: RoomStatsRow[],
): Promise<void> {
  if (!config || rows.length === 0) return;
  try {
    for (const r of rows) {
      await query(
        config,
        `insert into room_stats
           (room_code, player_id, nick, seat, matches, wins, rounds, total_score, best_score, worst_score, updated_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
         on conflict (room_code, player_id) do update set
           nick        = excluded.nick,
           seat        = excluded.seat,
           matches     = excluded.matches,
           wins        = excluded.wins,
           rounds      = excluded.rounds,
           total_score = excluded.total_score,
           best_score  = excluded.best_score,
           worst_score = excluded.worst_score,
           updated_at  = now()`,
        [
          roomCode,
          r.playerId,
          r.nick,
          r.seat,
          r.matches,
          r.wins,
          r.rounds,
          r.totalScore,
          r.bestScore,
          r.worstScore,
        ],
      );
    }
  } catch {
    // Ver cabecera: registrar y tragar. Nunca propagar.
  }
}
