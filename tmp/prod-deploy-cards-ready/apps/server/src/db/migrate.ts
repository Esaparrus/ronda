// Runner de migraciones. Contrato §4 / P7.
//
// Crea la tabla _migrations, aplica en orden los .sql no aplicados dentro de una
// transacción y registra el resultado. Idempotente: ejecutarlo dos veces no falla.
//
// Uso: pnpm db:migrate
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, type DbConfig } from './client.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Aplica las migraciones pendientes. Devuelve el número de migraciones aplicadas. */
export async function runMigrations(config: DbConfig, migrationsDir?: string): Promise<number> {
  const dir = migrationsDir ?? resolveMigrationsDir();

  // Asegura la tabla de control.
  await query(config, `
    create table if not exists _migrations (
      id        text primary key,
      applied_at timestamptz not null default now(),
      checksum  text not null
    )
  `);

  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  // Las ya aplicadas.
  const appliedRes = await query<{ id: string }>(config, 'select id from _migrations');
  const applied = new Set(appliedRes.rows.map((r) => r.id));

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(join(dir, file), 'utf8');
    await applyInTransaction(config, file, sql);
    count++;
  }
  return count;
}

async function applyInTransaction(config: DbConfig, file: string, sql: string): Promise<void> {
  const checksum = await sha256(sql);
  // Ejecuta la migración y el registro dentro de la misma transacción.
  await query(config, 'begin');
  try {
    await query(config, sql);
    await query(config, 'insert into _migrations (id, checksum) values ($1, $2)', [file, checksum]);
    await query(config, 'commit');
  } catch (e) {
    await query(config, 'rollback');
    throw e;
  }
}

async function sha256(text: string): Promise<string> {
  const { createHash } = await import('node:crypto');
  return createHash('sha256').update(text).digest('hex');
}

/** Directorio de migraciones por defecto (db/migrations desde la raíz del repo). */
function resolveMigrationsDir(): string {
  // apps/server/src/db/ → subir 4 niveles → db/migrations
  return join(__dirname, '..', '..', '..', '..', 'db', 'migrations');
}
