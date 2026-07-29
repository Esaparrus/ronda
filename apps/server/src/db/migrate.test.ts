// Tests de migración: requieren TEST_DATABASE_URL (Postgres real). Si no existe,
// se saltan (describe.skip) según el contrato §P7.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { runMigrations } from './migrate.ts';
import { query, closePool } from './client.ts';

const URL = process.env.TEST_DATABASE_URL;
const hasDb = typeof URL === 'string' && URL.length > 0;

describe.skipIf(!hasDb)('migraciones (Postgres real)', () => {
  const config = { connectionString: URL ?? 'postgres://x' };

  beforeAll(async () => {
    // Limpia el esquema para que el test sea reproducible.
    await query(config, 'drop schema if exists public cascade');
    await query(config, 'create schema public');
  });

  it('aplica las migraciones desde cero', async () => {
    const n = await runMigrations(config);
    expect(n).toBeGreaterThanOrEqual(1);
  });

  it('es idempotente: ejecutar dos veces no aplica nada nuevo', async () => {
    await runMigrations(config);
    const n = await runMigrations(config);
    expect(n).toBe(0);
  });

  it('las tablas del contrato existen', async () => {
    for (const t of ['rooms', 'players', 'matches', 'match_events', 'playtest_events']) {
      const res = await query(config, 'select to_regclass($1) as exists', [`public.${t}`]);
      expect(res.rows[0]?.exists).not.toBeNull();
    }
  });

  it('track de playtest inserta filas', async () => {
    const { track } = await import('./playtest-repo.ts');
    await track(config, 'room_created', { foo: 1 }, 'TEST');
    const res = await query(config, "select * from playtest_events where room_code = 'TEST'");
    expect(res.rows.length).toBe(1);
  });
});

describe.skipIf(hasDb)('migraciones (sin BD)', () => {
  it('se omite por falta de TEST_DATABASE_URL', () => {
    // Marker: este suite existe para documentar que los tests de BD se saltan
    // cuando no hay una BD de pruebas configurada.
    expect(true).toBe(true);
  });
});

// Cierra el pool al final para que vitest no se quede colgado.
afterAll(async () => {
  await closePool();
});
