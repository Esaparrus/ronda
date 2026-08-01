// Texto en castellano para cada ErrorCode. Contrato §2.2.
// Voz de la interfaz: frase corta, verbo activo, sin exclamaciones, sin disculpas,
// siempre dicen qué hacer. Interpolación: '{n}' se sustituye por el parámetro.
import { ERROR_CODES, type ErrorCode } from './errors.ts';

const MESSAGES: Readonly<Record<ErrorCode, string>> = {
  ROOM_NOT_FOUND: 'Esa sala no existe. Comprueba el código.',
  ROOM_FULL: 'La sala está completa.',
  ROOM_ALREADY_STARTED: 'La partida ya ha empezado.',
  ROOM_CLOSED: 'La sala se ha cerrado.',
  NICK_TAKEN: 'Ese nombre ya está cogido en esta sala.',
  NICK_INVALID: 'Escribe un nombre válido (2 a 12 caracteres).',
  NOT_HOST: 'Solo el anfitrión puede hacer eso.',
  NOT_ENOUGH_PLAYERS: 'Hacen falta al menos dos jugadores.',
  INVALID_TOKEN: 'Tu sesión no es válida. Vuelve a entrar.',
  PLAYER_NOT_IN_ROOM: 'No estás en esa sala.',
  PLAYER_ELIMINATED: 'Has quedado eliminado.',
  NOT_YOUR_TURN: 'Todavía no es tu turno.',
  INVALID_ACTION: 'Esa jugada no es válida.',
  CARD_NOT_IN_HAND: 'Esa carta no está en tu mano.',
  MUST_DRAW_FIRST: 'Primero roba una carta.',
  ALREADY_DREW: 'Ya has robado. Descarta una carta.',
  CANNOT_CLOSE: 'No puedes cerrar: te sobran más de {n} puntos.',
  CANNOT_DISCARD_DRAWN_CARD: 'No puedes descartar la carta que acabas de robar.',
  STALE_VERSION: 'La partida ha avanzado. Vuelve a intentarlo.',
  GAME_NOT_FOUND: 'Ese juego no existe.',
  RATE_LIMITED: 'Demasiadas acciones seguidas. Espera un momento.',
  INTERNAL: 'Algo ha fallado. Vuelve a intentarlo.',
  INVALID_BID: 'Ese cante no es válido para esta ronda.',
  BID_HOOKED: 'Ese cante dejaría la suma exacta. Elige otro número.',
  MUST_FOLLOW_SUIT: 'Tienes que jugar una carta del palo que ha salido.',
  NOT_YOUR_TRICK: 'Todavía no te toca jugar en esta baza.',
};

/**
 * Devuelve el texto de un ErrorCode, interpolando {n} con `params.n` si existe.
 */
export function messageFor(code: ErrorCode, params?: { n?: number | string }): string {
  const tpl = MESSAGES[code];
  if (params && 'n' in params && params.n !== undefined) {
    return tpl.replace('{n}', String(params.n));
  }
  return tpl;
}

/** Comprobación en tiempo de carga: cada ErrorCode tiene texto. */
export function assertAllMessages(): void {
  for (const code of ERROR_CODES) {
    if (!(code in MESSAGES)) {
      throw new Error(`messages.ts: falta el texto para ${code}`);
    }
  }
}
