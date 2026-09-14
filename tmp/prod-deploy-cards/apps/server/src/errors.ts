// Manejo de errores del servidor. Contrato §1, §2.2, P5.
//
// AppError ya existe en @ronda/protocol (con `code` y `detail`). Aquí añadimos
// `handle(fn)`: envuelve una función que puede lanzar y devuelve un Result<Err>,
// registrando el error si es inesperado (INTERNAL).
import { AppError, type ErrorCode, type Result, err, ok } from '@ronda/protocol';
import type { Logger } from './logger.ts';

export { AppError } from '@ronda/protocol';

/** Lanza un AppError. Úsalo dentro de `handle` para errores esperados. */
export function throwAppError(code: ErrorCode, detail?: string): never {
  throw new AppError(code, detail);
}

/**
 * Envuelve una función sincrónica que puede lanzar.
 * - AppError → Result con su code/detail.
 * - Cualquier otra excepción → INTERNAL, registrada con el logger.
 */
export function handle<T>(logger: Logger, fn: () => T): Result<T> {
  try {
    return ok(fn());
  } catch (e) {
    if (e instanceof AppError) {
      return err(e.code, e.detail);
    }
    const detail = e instanceof Error ? e.message : String(e);
    logger.error('error inesperado', { detail, stack: e instanceof Error ? e.stack : undefined });
    return err('INTERNAL', detail);
  }
}

/**
 * Variante async de handle. Para manejadores de socket que hacen I/O.
 */
export async function handleAsync<T>(
  logger: Logger,
  fn: () => Promise<T>,
): Promise<Result<T>> {
  try {
    const value = await fn();
    return ok(value);
  } catch (e) {
    if (e instanceof AppError) {
      return err(e.code, e.detail);
    }
    const detail = e instanceof Error ? e.message : String(e);
    logger.error('error inesperado', { detail, stack: e instanceof Error ? e.stack : undefined });
    return err('INTERNAL', detail);
  }
}
