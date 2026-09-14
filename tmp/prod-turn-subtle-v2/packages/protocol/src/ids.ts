// Identificadores y constantes de sala. Contrato §2.1.

/** Código de sala: 4 caracteres del alfabeto sin ambigüedades. */
export type RoomCode = string;

/** Identificador de jugador: uuid v4. */
export type PlayerId = string;

/**
 * Identificador de partida/juego. Contrato §10.1 (P21/P22): ensanchado para
 * Pocha; §12.12 (P27/P28): ensanchado para Mus, mismo patrón.
 */
export type GameId =
  | 'chinchon'
  | 'pocha'
  | 'mus'
  | 'brisca'
  | 'escoba'
  | 'sieteymedia'
  | 'tute'
  | 'cinquillo'
  | 'orden'
  | 'colores'
  | 'mayoria'
  | 'escala'
  | 'laronda';

/**
 * Identificador de carta: '<suit>-<rank>' con suit ∈ {oros,copas,espadas,
 * bastos} y rank ∈ {1..7, 10, 11, 12} — la baraja española de 40 (§5.1).
 *
 * P31: ya no existe 'joker-1' | 'joker-2'. Los tres juegos reparten la misma
 * baraja de 40 naipes, sin ochos, sin nueves y sin comodines.
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
export const MAX_PLAYERS = 8; // La Ronda admite una mesa completa de 8
export const MIN_PLAYERS = 2; // sin cambio -- Chinchón lo sigue necesitando
