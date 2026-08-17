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
/** Tiempo máximo por turno en segundos; 0 significa sin límite. */
const TURN_TIME_SECONDS = z.union([
  z.literal(0),
  z.literal(10),
  z.literal(20),
  z.literal(30),
  z.literal(60),
]);

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
  turnTimeSeconds: TURN_TIME_SECONDS.default(60),
});

export type ChinchonConfig = z.infer<typeof ChinchonConfigSchema>;

// --- Pocha (§9.10, §10.2) ----------------------------------------------------

/** Nº de jugadores de Pocha: 2 a 6. */
const POCHA_MAX_PLAYERS = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);
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
/** Dónde está sentada la cuadrilla. Las reglas y el tanteo son idénticos;
 * solo cambia la ayuda de interfaz porque en presencial pueden hablar. */
const MUS_MODO = z.union([z.literal('presencial'), z.literal('online')]);

export const MusConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('mus' satisfies GameId).default('mus'),
  maxPlayers: MUS_MAX_PLAYERS.default(4),
  modo: MUS_MODO.default('presencial'),
  ochoReyes: z.boolean().default(false),
  juegos: MUS_JUEGOS.default(1),
  puntoVale: PUNTO_VALE.default(1),
});

export type MusConfig = z.infer<typeof MusConfigSchema>;

// --- Clásicos de baraja española -----------------------------------------

const CLASSIC_TWO_TO_FOUR = z.union([z.literal(2), z.literal(3), z.literal(4)]);

const CLASSIC_TWO_TO_SEVEN = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);

const CLASSIC_TWO_TO_SIX = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

/** Brisca individual. La primera versión prioriza 2–4 sin señas ni parejas. */
export const BriscaConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('brisca' satisfies GameId).default('brisca'),
  maxPlayers: CLASSIC_TWO_TO_FOUR.default(4),
});
export type BriscaConfig = z.infer<typeof BriscaConfigSchema>;

/** Escoba del 15 individual, una baraja y una mano completa por partida. */
export const EscobaConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('escoba' satisfies GameId).default('escoba'),
  maxPlayers: CLASSIC_TWO_TO_FOUR.default(4),
});
export type EscobaConfig = z.infer<typeof EscobaConfigSchema>;

/** Siete y media con banca rotatoria: una ronda de banca por participante. */
export const SieteYMediaConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('sieteymedia' satisfies GameId).default('sieteymedia'),
  maxPlayers: CLASSIC_TWO_TO_SEVEN.default(7),
});
export type SieteYMediaConfig = z.infer<typeof SieteYMediaConfigSchema>;

/** Tute de dos, con baceta, triunfo y obligación de asistir al agotarla. */
export const TuteConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('tute' satisfies GameId).default('tute'),
  maxPlayers: z.literal(2).default(2),
});
export type TuteConfig = z.infer<typeof TuteConfigSchema>;

/** Cinquillo sobre baraja española de 40 cartas. */
export const CinquilloConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('cinquillo' satisfies GameId).default('cinquillo'),
  maxPlayers: CLASSIC_TWO_TO_SIX.default(6),
});
export type CinquilloConfig = z.infer<typeof CinquilloConfigSchema>;

export type ClassicConfig =
  BriscaConfig | EscobaConfig | SieteYMediaConfig | TuteConfig | CinquilloConfig;

// --- Modos sociales ---------------------------------------------------------

/** Los modos de mesa están pensados para una cuadrilla, no para una partida
 * por turnos: todos pueden participar a la vez. */
const PARTY_MAX_PLAYERS = z.union([
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
]);
const PARTY_ROUNDS = z.union([
  z.literal(5),
  z.literal(7),
  z.literal(10),
  z.literal(12),
  z.literal(15),
  z.literal(20),
]);
const PARTY_POINTS = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(20),
  z.literal(25),
  z.literal(30),
  z.literal(40),
]);
const PARTY_CARDS_PER_PLAYER = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
  z.literal(9),
  z.literal(10),
]);

export const OrdenConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('orden' satisfies GameId).default('orden'),
  maxPlayers: PARTY_MAX_PLAYERS.default(7),
  cardsPerPlayer: PARTY_CARDS_PER_PLAYER.default(1),
});

export type OrdenConfig = z.infer<typeof OrdenConfigSchema>;

export const COLOR_TOPICS = [
  'todo',
  'animacion',
  'series',
  'cine',
  'banderas',
  'logos',
  'juegos',
  'cultura',
] as const;

export const ColorTopicSchema = z.enum(COLOR_TOPICS);
export type ColorTopic = z.infer<typeof ColorTopicSchema>;
export type ColorQuestionCategory = Exclude<ColorTopic, 'todo'>;

export const ColoresConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('colores' satisfies GameId).default('colores'),
  maxPlayers: PARTY_MAX_PLAYERS.default(7),
  /** Red de seguridad: normalmente la partida termina antes al llegar a 10 puntos. */
  rounds: PARTY_ROUNDS.default(20),
  pointsToWin: PARTY_POINTS.default(10),
  topic: ColorTopicSchema.default('todo'),
});

export type ColoresConfig = z.infer<typeof ColoresConfigSchema>;

/** El primer jugador que responde abre este plazo para el resto de la mesa. */
export const COLOR_ANSWER_SECONDS = 15;

export const MayoriaConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('mayoria' satisfies GameId).default('mayoria'),
  maxPlayers: PARTY_MAX_PLAYERS.default(7),
  rounds: PARTY_ROUNDS.default(10),
  pointsToWin: PARTY_POINTS.default(10),
});

export type MayoriaConfig = z.infer<typeof MayoriaConfigSchema>;

export const EscalaConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('escala' satisfies GameId).default('escala'),
  maxPlayers: PARTY_MAX_PLAYERS.default(7),
  rounds: PARTY_ROUNDS.default(10),
  pointsToWin: PARTY_POINTS.default(10),
});

export type EscalaConfig = z.infer<typeof EscalaConfigSchema>;

export type PartyConfig = OrdenConfig | ColoresConfig | MayoriaConfig | EscalaConfig;

// --- La Ronda --------------------------------------------------------------

const LA_RONDA_MAX_PLAYERS = z.union([
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
  z.literal(7),
  z.literal(8),
]);

/** Juego original de tapas y cuenta compartida. No usa la baraja española. */
export const LaRondaConfigSchema = CommonGameConfigSchema.extend({
  gameId: z.literal('laronda' satisfies GameId).default('laronda'),
  maxPlayers: LA_RONDA_MAX_PLAYERS.default(8),
});

export type LaRondaConfig = z.infer<typeof LaRondaConfigSchema>;

// --- Unión discriminada ------------------------------------------------------

/**
 * Config válida para cualquier juego. Unión discriminada por `gameId`
 * (§10.2). Antes de P22 era, en la práctica, un alias de `ChinchonConfig`.
 */
export type GameConfig =
  ChinchonConfig | PochaConfig | MusConfig | ClassicConfig | PartyConfig | LaRondaConfig;

export const GameConfigSchema = z.discriminatedUnion('gameId', [
  ChinchonConfigSchema,
  PochaConfigSchema,
  MusConfigSchema,
  BriscaConfigSchema,
  EscobaConfigSchema,
  SieteYMediaConfigSchema,
  TuteConfigSchema,
  CinquilloConfigSchema,
  OrdenConfigSchema,
  ColoresConfigSchema,
  MayoriaConfigSchema,
  EscalaConfigSchema,
  LaRondaConfigSchema,
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

export const DEFAULT_BRISCA_CONFIG: BriscaConfig = BriscaConfigSchema.parse({});
export const DEFAULT_ESCOBA_CONFIG: EscobaConfig = EscobaConfigSchema.parse({});
export const DEFAULT_SIETE_Y_MEDIA_CONFIG: SieteYMediaConfig = SieteYMediaConfigSchema.parse({});
export const DEFAULT_TUTE_CONFIG: TuteConfig = TuteConfigSchema.parse({});
export const DEFAULT_CINQUILLO_CONFIG: CinquilloConfig = CinquilloConfigSchema.parse({});

export const DEFAULT_ORDEN_CONFIG: OrdenConfig = OrdenConfigSchema.parse({});
export const DEFAULT_COLORES_CONFIG: ColoresConfig = ColoresConfigSchema.parse({});
export const DEFAULT_MAYORIA_CONFIG: MayoriaConfig = MayoriaConfigSchema.parse({});
export const DEFAULT_ESCALA_CONFIG: EscalaConfig = EscalaConfigSchema.parse({});
export const DEFAULT_LA_RONDA_CONFIG: LaRondaConfig = LaRondaConfigSchema.parse({});
