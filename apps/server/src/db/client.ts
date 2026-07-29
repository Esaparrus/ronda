// Pool de conexiones a Postgres. Contrato §4 / P7.
//
// Una sola cadena de conexión, permisos plenos, sin RLS. El navegador nunca
// habla con la BD. query<T> tipa el resultado; reintenta una vez ante error de
// conexión.
import { Pool, type QueryResult, type QueryResultRow } from 'pg';

export interface DbConfig {
  connectionString: string;
}

let pool: Pool | null = null;

/** Crea (o devuelve) el pool singleton. Idempotente. */
export function getPool(config: DbConfig): Pool {
  if (pool) return pool;
  pool = new Pool({ connectionString: config.connectionString });
  return pool;
}

/** Cierra el pool (tests / shutdown). */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

/**
 * Ejecuta una consulta con tipado. Reintenta una sola vez ante error de
 * conexión (códigos 08*, 57*, 58* de SQLSTATE = errores de conexión/servidor).
 */
export async function query<T extends QueryResultRow = QueryResultRow>(
  config: DbConfig,
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  const p = getPool(config);
  try {
    return await p.query<T>(text, params);
  } catch (e) {
    if (isTransient(e)) {
      // Un reintento tras un fallo transitorio.
      return await p.query<T>(text, params);
    }
    throw e;
  }
}

/** ¿Es un error transitorio de conexión que merece reintento? */
function isTransient(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const code = (e as { code?: string }).code;
  if (!code) return false;
  // Clases SQLSTATE de conexión/servidor.
  return /^(08|57|58|53)/.test(code);
}
