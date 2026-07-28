// Tipo Result para el motor: los errores se devuelven, no se lanzan. Contrato §1.
import type { ErrorCode } from './errors.ts';

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; code: ErrorCode; detail?: string };
export type Result<T> = Ok<T> | Err;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });

export const err = (code: ErrorCode, detail?: string): Err => ({
  ok: false,
  code,
  detail,
});

/** Type guard: ¿es un Ok? */
export const isOk = <T>(r: Result<T>): r is Ok<T> => r.ok === true;

/** Type guard: ¿es un Err? */
export const isErr = (r: Result<unknown>): r is Err => r.ok === false;
