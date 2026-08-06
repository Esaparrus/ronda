// Configuración de partida. Contrato §2.7, ensanchado en §10.2 (P21/P22)
// para admitir Pocha como segundo juego.
//
// GameConfig es ahora una unión discriminada por `gameId`, tal y como
// anticipaba el comentario original de este fichero (P1). ChinchonConfig
// gana un campo `gameId: 'chinchon'` que antes no tenía (necesario para que
// TypeScript distinga el miembro de la unión) y pasa a heredar
// `soundEnabled` de `CommonGameConfig` en vez de declararlo suelto -- ningún
// valor ni comportamiento de Chinchón cambia, es solo la forma del tipo
// (§10.2, cambio real a un contrato congelado, documentado explícitamente).
import { z } from 'zod';
import type { GameId } from './ids.ts';

/** Preferencia común a cualquier juego: no afecta al motor. Contrato §10.2. */
export const CommonGameConfigSchema = z.object({
  soundEnabled: z.boolean().default(true),
});

// --- Chinchón (§2.7, sin cambio de comportamiento) --------------------------

/** Nº máximo de jugadores (sala) de Chinchón. */
const CHINCHON_MAX_PLAYERS = z.union([z.literal(2), z.literal(3), z.literal(4)]);
/** Cartas en la mano (CONGELADO en 7 para el MVP). */
const HAND_SIZE = z.literal(7);
/** Puntos sueltos máximos para poder cerrar. */
const CLOSE_THRESHOLD = z.union([z.literal(0), z.literal(3), z.literal(5), z.literal(10)]);
/** Bonificación por cerrar en seco (0 puntos). */
const DRY_CLOSE_BONUS = z.union([z.literal(-10), z.literal(0)]);
/** Puntos a partir de los cuales un jugador queda eliminado (se elimina al SUPERARLO). */
const ELIMINATION_SCORE = z.union([z.literal(50), z.literal(100), z.literal(150)]);

// P31: `jokers`, `jokerPoints` y `maxJokersPerMeld` ya no existen. Los tres
// tenían sentido cuando la baraja de Chinchón era de 48 + 2 comodines; ahora
// los tres juegos reparten la misma baraja de 40 (§5.1) y no hay comodín que
// contar, puntuar ni limitar por combinación.
export const ChinchonConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('chinchon' satisfies GameId).default('chinchon'),
  maxPlayers: CHINCHON_MAX_PLAYERS.default(4),
  handSize: HAND_SIZE.default(7),
  closeThreshold: CLOSE_THRESHOLD.default(5),
  dryCloseBonus: DRY_CLOSE_BONUS.default(-10),
  eliminationScore: ELIMINATION_SCORE.default(100),
  chinchonEndsGame: z.boolean().default(true),
  forbidDiscardDrawnCard: z.boolean().default(true),
});

export type ChinchonConfig = z.infer<typeof ChinchonConfigSchema>;

// --- Pocha (§9.10, §10.2) ----------------------------------------------------

/** Nº de jugadores de Pocha: 3 a 6 (mínimo de partida 3, fijo, no configurable). */
const POCHA_MAX_PLAYERS = z.union([z.literal(3), z.literal(4), z.literal(5), z.literal(6)]);
/** Orden de fuerza para ganar bazas. Contrato §9.6. */
const RANK_ORDER = z.union([z.literal('numerico'), z.literal('brisca')]);

export const PochaConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('pocha' satisfies GameId).default('pocha'),
  trump: z.boolean().default(true),
  rankOrder: RANK_ORDER.default('numerico'),
  maxPlayers: POCHA_MAX_PLAYERS.default(4),
});

export type PochaConfig = z.infer<typeof PochaConfigSchema>;

// --- Mus (§12.12, P27/P28) ---------------------------------------------------

/** Nº de jugadores de Mus: exactamente 4, ni uno más ni uno menos (§12.2). */
const MUS_MAX_PLAYERS = z.literal(4);
/** Juegos ("vaca") que hay que ganar para llevarse la partida (§12.3). */
const MUS_JUEGOS = z.union([z.literal(1), z.literal(2), z.literal(3)]);
/** Piedras que paga el lance del punto cuando nadie tiene juego (§12.6 bis). */
const PUNTO_VALE = z.union([z.literal(1), z.literal(2)]);

export const MusConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('mus' satisfies GameId).default('mus'),
  maxPlayers: MUS_MAX_PLAYERS.default(4),
  ochoReyes: z.boolean().default(true),
  juegos: MUS_JUEGOS.default(1),
  puntoVale: PUNTO_VALE.default(1),
});

export type MusConfig = z.infer<typeof MusConfigSchema>;

// --- Unión discriminada ------------------------------------------------------

/**
 * Config válida para cualquier juego. Unión discriminada por `gameId`
 * (§10.2). Antes de P22 era, en la práctica, un alias de `ChinchonConfig`.
 */
export type GameConfig = ChinchonConfig | PochaConfig | MusConfig;

export const GameConfigSchema = z.discriminatedUnion('gameId', [
  ChinchonConfigSchema,
  PochaConfigSchema,
  MusConfigSchema,
]);

/**
 * Config de Chinchón por defecto (la que devuelve `ChinchonConfigSchema.parse({})`).
 * Tipada como `ChinchonConfig` (no como el `GameConfig` ensanchado) a
 * propósito: es más precisa -- sigue siendo asignable a `GameConfig`
 * en cualquier sitio que lo pida -- y evita que el ensanche de tipo de P22
 * rompa el tipado de quien ya la usaba asumiendo los campos de Chinchón
 * (p.ej. `core/deck.ts`).
 */
export const DEFAULT_CONFIG: ChinchonConfig = ChinchonConfigSchema.parse({});

/** Config de Pocha por defecto, mismo patrón que `DEFAULT_CONFIG` de arriba. */
export const DEFAULT_POCHA_CONFIG: PochaConfig = PochaConfigSchema.parse({});

/** Config de Mus por defecto, mismo patrón que `DEFAULT_CONFIG` de arriba. */
export const DEFAULT_MUS_CONFIG: MusConfig = MusConfigSchema.parse({});
