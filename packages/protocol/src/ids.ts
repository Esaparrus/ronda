// Identificadores y constantes de sala. Contrato §2.1.

/** Código de sala: 4 caracteres del alfabeto sin ambigüedades. */
export type RoomCode = string;

/** Identificador de jugador: uuid v4. */
export type PlayerId = string;

/** Identificador de partida/juego. Contrato §10.1 (P21/P22): ensanchado para Pocha. */
export type GameId = 'chinchon' | 'pocha';

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

/**
 * Límite ABSOLUTO de sala (unión de los rangos de todos los juegos), no el
 * límite de un juego concreto. Contrato §10.6 (P21/P22). El límite real de
 * cada partida lo pone `config.maxPlayers` del `GameConfig` de ese juego.
 */
export const MAX_PLAYERS = 6; // antes 4 (límite de Chinchón únicamente)
export const MIN_PLAYERS = 2; // sin cambio -- Chinchón lo sigue necesitando
