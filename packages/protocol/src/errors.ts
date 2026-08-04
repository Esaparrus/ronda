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
  // --- Pocha (§10.5, P21/P22) ---
  'INVALID_BID', // cante fuera de 0..roundSize
  'BID_HOOKED', // repartidor intentando el cante prohibido por el enganche (§9.4)
  'MUST_FOLLOW_SUIT', // jugó fuera de palo teniendo cartas del palo que salió (§9.5)
  'NOT_YOUR_TRICK', // jugó carta fuera de su turno de baza
  // --- Mus (§12.12, P27/P28) ---
  'NOT_IN_MUS_PHASE', // dijo mus/no hay mus fuera de la fase de mus (§12.5)
  'MUST_DISCARD_AT_LEAST_ONE', // descarte de 0 cartas, o de más de 4 (§12.5)
  'BET_TOO_LOW', // envite por debajo del mínimo (2) o que no sube el anterior (§12.7)
  'CANNOT_BID_WITHOUT_PARES', // envidó en pares sin haber declarado que tiene (§12.7)
  'CANNOT_BID_WITHOUT_JUEGO', // envidó en juego sin haber declarado que tiene (§12.7)
  'NOT_YOUR_TEAM_TURN', // responde al envite quien no es de la pareja contraria (§12.7)
  // Añadido en P28 sobre la lista de §12.12: `declararPares`/`declararJuego`
  // son acciones del jugador pero la respuesta verdadera está en sus cartas,
  // y el motor es la autoridad (§2 «el cliente nunca decide nada»). Sin este
  // código, mentir caería en el genérico INVALID_ACTION y la interfaz no
  // podría explicar qué pasó.
  'FALSE_DECLARATION', // declaró pares/juego contra lo que dice su mano (§12.6)
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
