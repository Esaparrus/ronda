// Configuración del servidor desde variables de entorno. Contrato §6 / P5.
//
// Falla al arrancar si falta DATABASE_URL. PORT, CORS_ORIGIN y NODE_ENV tienen
// defaults razonables.
import { z } from 'zod';

/** Una sala sin jugadores conectados ni mutaciones durante media hora se considera abandonada. */
export const DEFAULT_ROOM_INACTIVITY_MINUTES = 30;
/** Si no llega presencia de la pestaña durante este tiempo, se considera desconectada. */
export const DEFAULT_ROOM_PRESENCE_TIMEOUT_SECONDS = 90;

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
  ROOM_PRESENCE_TIMEOUT_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(DEFAULT_ROOM_PRESENCE_TIMEOUT_SECONDS),
  AMAZON_PRICE_JUSTO_ENABLED: z.preprocess(
    (value) => {
      if (value === undefined) return undefined;
      if (value === true || value === 'true' || value === '1') return true;
      if (value === false || value === 'false' || value === '0') return false;
      return value;
    },
    z.boolean().default(false),
  ),
  AMAZON_CREATORS_API_CREDENTIAL_ID: z.string().trim().min(1).optional(),
  AMAZON_CREATORS_API_CREDENTIAL_SECRET: z.string().trim().min(1).optional(),
  AMAZON_CREATORS_API_VERSION: z.enum(['3.1', '3.2', '3.3']).default('3.2'),
  AMAZON_PARTNER_TAG: z.string().trim().min(1).optional(),
  AMAZON_MARKETPLACE: z.string().trim().min(1).default('www.amazon.es'),
  AMAZON_PRICE_JUSTO_MAX_ITEMS_PER_CATEGORY: z.coerce
    .number()
    .int()
    .min(1)
    .max(10)
    .default(6),
  AMAZON_PRICE_JUSTO_REFRESH_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(1440)
    .default(60),
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
