// Configuración del servidor desde variables de entorno. Contrato §6 / P5.
//
// Falla al arrancar si falta DATABASE_URL. PORT, CORS_ORIGIN y NODE_ENV tienen
// defaults razonables.
import { z } from 'zod';

/** Una sala sin jugadores conectados ni mutaciones durante media hora se considera abandonada. */
export const DEFAULT_ROOM_INACTIVITY_MINUTES = 30;

const ConfigSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria'),
  PORT: z.coerce.number().int().positive().default(8787),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ROOM_INACTIVITY_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_ROOM_INACTIVITY_MINUTES),
});

export type ServerConfig = z.infer<typeof ConfigSchema>;

/**
 * Carga y valida la configuración desde `env` (por defecto process.env).
 * Lanza un error claro si algún campo obligatorio falta o es inválido.
 */
export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const parsed = ConfigSchema.safeParse(env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    throw new Error(`Configuración inválida:\n${issues}`);
  }
  return parsed.data;
}

export const isProd = (c: ServerConfig): boolean => c.NODE_ENV === 'production';
export const isDev = (c: ServerConfig): boolean => c.NODE_ENV === 'development';
