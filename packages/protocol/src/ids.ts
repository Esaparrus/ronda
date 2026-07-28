// Identificadores y constantes de sala. Contrato §2.1.

/** Código de sala: 4 caracteres del alfabeto sin ambigüedades. */
export type RoomCode = string;

/** Identificador de jugador: uuid v4. */
export type PlayerId = string;

/** Identificador de partida/juego. Por ahora solo Chinchón. */
export type GameId = 'chinchon';

/**
 * Identificador de carta. Formato:
 *   - '<suit>-<rank>' con suit ∈ {oros,copas,espadas,bastos}, rank ∈ 1..12
 *   - 'joker-1' | 'joker-2'
 */
export type CardId = string;

/**
 * Alfabeto del código de sala sin caracteres visualmente ambiguos
 * (sin I, O, 0, 1). Contrato §2.1 / §6.
 */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const ROOM_CODE_LENGTH = 4;

export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;
