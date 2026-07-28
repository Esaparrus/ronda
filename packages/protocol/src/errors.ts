// Códigos de error (lista cerrada). Contrato §2.2.

export const ERROR_CODES = [
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'ROOM_ALREADY_STARTED',
  'ROOM_CLOSED',
  'NICK_TAKEN',
  'NICK_INVALID',
  'NOT_HOST',
  'NOT_ENOUGH_PLAYERS',
  'INVALID_TOKEN',
  'PLAYER_NOT_IN_ROOM',
  'PLAYER_ELIMINATED',
  'NOT_YOUR_TURN',
  'INVALID_ACTION',
  'CARD_NOT_IN_HAND',
  'MUST_DRAW_FIRST',
  'ALREADY_DREW',
  'CANNOT_CLOSE',
  'CANNOT_DISCARD_DRAWN_CARD',
  'STALE_VERSION',
  'GAME_NOT_FOUND',
  'RATE_LIMITED',
  'INTERNAL',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/**
 * Error de aplicación: se lanza en el servidor, no en el motor.
 * El motor devuelve Result<Err>; el servidor lo envuelve/lanza.
 * Contrato §1.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly detail?: string;

  constructor(code: ErrorCode, detail?: string) {
    super(code);
    this.name = 'AppError';
    this.code = code;
    this.detail = detail;
  }
}

/** Comprueba que un string es un ErrorCode válido (entrada externa). */
export const isErrorCode = (value: unknown): value is ErrorCode =>
  typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value);
