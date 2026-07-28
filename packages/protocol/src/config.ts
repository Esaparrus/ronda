// Configuración de partida. Contrato §2.7.
//
// La config concreta de Chinchón vive en ChinchonConfig. Por ahora solo existe
// ese juego, así que GameConfig es un alias de ChinchonConfig. Cuando llegue el
// segundo juego (post-MVP), GameConfig pasará a ser una unión discriminada por
// `gameId`:
//   export type GameConfig = ChinchonConfig | PochaConfig | ...
// El cambio se hace en este único fichero, no por todo el código.
import { z } from 'zod';
import type { GameId } from './ids.ts';

/** Nº máximo de jugadores (sala). */
const MAX_PLAYERS = z.union([z.literal(2), z.literal(3), z.literal(4)]);
/** Cartas en la mano (CONGELADO en 7 para el MVP). */
const HAND_SIZE = z.literal(7);
/** Nº de comodines en la baraja. */
const JOKERS = z.union([z.literal(0), z.literal(2)]);
/** Puntos sueltos máximos para poder cerrar. */
const CLOSE_THRESHOLD = z.union([z.literal(0), z.literal(3), z.literal(5), z.literal(10)]);
/** Bonificación por cerrar en seco (0 puntos). */
const DRY_CLOSE_BONUS = z.union([z.literal(-10), z.literal(0)]);
/** Puntos a partir de los cuales un jugador queda eliminado (se elimina al SUPERARLO). */
const ELIMINATION_SCORE = z.union([z.literal(50), z.literal(100), z.literal(150)]);
/** Puntos de un comodín suelto (deadwood). */
const JOKER_POINTS = z.union([z.literal(20), z.literal(25)]);
/** Máximo comodines por combinación (CONGELADO en 1). */
const MAX_JOKERS_PER_MELD = z.literal(1);

export const ChinchonConfigSchema = z.object({
  gameId: z.literal('chinchon' satisfies GameId).default('chinchon'),
  maxPlayers: MAX_PLAYERS.default(4),
  handSize: HAND_SIZE.default(7),
  jokers: JOKERS.default(2),
  closeThreshold: CLOSE_THRESHOLD.default(5),
  dryCloseBonus: DRY_CLOSE_BONUS.default(-10),
  eliminationScore: ELIMINATION_SCORE.default(100),
  chinchonEndsGame: z.boolean().default(true),
  jokerPoints: JOKER_POINTS.default(25),
  maxJokersPerMeld: MAX_JOKERS_PER_MELD.default(1),
  forbidDiscardDrawnCard: z.boolean().default(true),
  soundEnabled: z.boolean().default(true),
});

export type ChinchonConfig = z.infer<typeof ChinchonConfigSchema>;

/**
 * Config válida para cualquier juego. Por ahora, solo Chinchón.
 * El `gameId` está dentro de la config para que la unión discriminada futura
 * funcione sin tocar las firmas que reciben `GameConfig`.
 */
export type GameConfig = ChinchonConfig;

export const GameConfigSchema = ChinchonConfigSchema;

/** Config por defecto (la que devuelve `GameConfigSchema.parse({})`). */
export const DEFAULT_CONFIG: GameConfig = ChinchonConfigSchema.parse({});
