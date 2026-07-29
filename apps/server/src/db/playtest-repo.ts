// Repositorio de telemetría de playtest. Contrato §4 / P7 / P18.
//
// track() NUNCA lanza: los fallos se registran y se ignoran (la telemetría no
// puede tumbar una partida). Solo escribe un apodo como dato "personal", y aun
// así lo descarta: payload anónimo.
import { query, type DbConfig } from './client.ts';

/** Registra un evento de telemetría. No lanza nunca. */
export async function track(
  config: DbConfig | null,
  kind: string,
  payload?: Record<string, unknown>,
  roomCode?: string,
): Promise<void> {
  if (!config) return;
  try {
    await query(
      config,
      'insert into playtest_events (room_code, kind, payload) values ($1, $2, $3)',
      [roomCode ?? null, kind, JSON.stringify(payload ?? {})],
    );
  } catch {
    // Telemetría: registrar y tragar. Nunca propagar.
  }
}
