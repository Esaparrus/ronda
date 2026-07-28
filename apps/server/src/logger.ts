// Logger mínimo propio. Sin dependencias. Contrato §P5.
//
// - En producción: una línea JSON por evento (parseable por cualquier colector).
// - En desarrollo: texto legible con nivel y mensaje.
//
// Niveles: debug, info, warn, error. Por defecto se emiten todos en dev y
// info+ en prod (debug se descarta).
import { isProd, type ServerConfig } from './config.ts';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(msg: string, fields?: Record<string, unknown>): void;
  info(msg: string, fields?: Record<string, unknown>): void;
  warn(msg: string, fields?: Record<string, unknown>): void;
  error(msg: string, fields?: Record<string, unknown>): void;
  child(fields: Record<string, unknown>): Logger;
}

function shouldEmit(level: LogLevel, min: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[min];
}

function writeLine(level: LogLevel, msg: string, fields: Record<string, unknown>, prod: boolean): void {
  const ts = Date.now();
  if (prod) {
    const payload = JSON.stringify({ ts, level, msg, ...fields });
    console[level === 'debug' ? 'log' : level](payload);
  } else {
    const f = Object.keys(fields).length ? ' ' + JSON.stringify(fields) : '';
    console[level === 'debug' ? 'log' : level](`[${level.toUpperCase()}] ${msg}${f}`);
  }
}

export function createLogger(config: ServerConfig, baseFields: Record<string, unknown> = {}): Logger {
  const prod = isProd(config);
  const minLevel: LogLevel = prod ? 'info' : 'debug';

  function emit(level: LogLevel, msg: string, fields?: Record<string, unknown>): void {
    if (!shouldEmit(level, minLevel)) return;
    writeLine(level, msg, { ...baseFields, ...(fields ?? {}) }, prod);
  }

  return {
    debug: (m, f) => emit('debug', m, f),
    info: (m, f) => emit('info', m, f),
    warn: (m, f) => emit('warn', m, f),
    error: (m, f) => emit('error', m, f),
    child: (fields) => createLogger(config, { ...baseFields, ...fields }),
  };
}
