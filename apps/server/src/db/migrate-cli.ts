// Entrypoint CLI para aplicar migraciones: pnpm db:migrate
import { loadConfig } from '../config.ts';
import { createLogger } from '../logger.ts';
import { runMigrations } from './migrate.ts';

const config = loadConfig();
const logger = createLogger(config, { service: 'ronda-migrate' });

try {
  const n = await runMigrations({ connectionString: config.DATABASE_URL });
  logger.info(n > 0 ? `aplicadas ${n} migraciones` : 'sin migraciones pendientes');
  process.exit(0);
} catch (e) {
  logger.error('migración falló', { detail: e instanceof Error ? e.message : String(e) });
  process.exit(1);
}
