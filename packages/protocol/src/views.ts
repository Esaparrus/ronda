// Vistas que el servidor envía al cliente (siempre censuradas). Contrato §2.5,
// ensanchado en P22 (motor de Pocha) para admitir un segundo juego.
//
// Gap encontrado durante P22 (no cubierto por §10, P21): §10 amplió GameId,
// GameConfig, GameEvent, GameAction y ERROR_CODES para Pocha, pero nunca
// diseñó la forma de su PlayerView/TableView -- CommonView (de antes de P22)
// asumía campos de Chinchón (turnPhase, deckCount, discardTop/Count) como
// obligatorios al nivel superior. Se resuelve aquí siguiendo el mismo patrón
// ya usado para GameConfig (§10.2): unión discriminada por `gameId`. La forma
// de Chinchón (ChinchonCommonView/ChinchonPlayerView/ChinchonTableView/
// RoundResult) es EXACTAMENTE la misma que ya existía -- solo cambia de
// nombre al pasar a ser un miembro de la unión, ningún campo ni
// comportamiento cambia. Pocha añade su propia forma al lado.
//
// Invariante de seguridad (verificable con un test, §2.5 final):
//   serializar una TableView o una PlayerView y comprobar que no aparece ningún
//   CardId de la mano de otro jugador, salvo dentro de roundResult cuando
//   status !== 'playing'.
import { z } from 'zod';
import type { CardId, PlayerId, RoomCode } from './ids.ts';
import type { Suit } from './cards.ts';
import type { ChinchonConfig, MusConfig, PochaConfig } from './config.ts';

export type ViewStatus = 'lobby' | 'playing' | 'roundEnd' | 'gameEnd';
export type TurnPhase = 'draw' | 'discard' | null;

/** Acción de juego disponible para el jugador en este momento (Chinchón). */
export type AvailableAction = 'drawDeck' | 'drawDiscard' | 'discard' | 'close';

/** Acción de juego disponible para el jugador en este momento (Pocha). */
export type PochaAvailableAction = 'bid' | 'playCard' | 'nextRound';

/**
 * Jugador público (sin mano). Compartido por ambos juegos: los campos son
 * genéricos de verdad. `colorIndex` se ensanchó a `0|1|2|3|4|5` (§10.7,
 * resuelto en la pantalla de Pocha): 2 colores de asiento nuevos
 * (`--seat-4`/`--seat-5`, `apps/web/src/styles/globals.css`) para los
 * asientos 5 y 6, que Chinchón nunca usa (máximo 4 jugadores).
 */
export interface PublicPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number; // 0..3 en Chinchón y Mus; 0..5 en Pocha
  colorIndex: 0 | 1 | 2 | 3 | 4 | 5; // color de asiento, asignado por asiento
  score: number; // acumulado de la partida
  handCount: number; // nº de cartas, nunca cuáles
  connected: boolean;
  isHost: boolean;
  eliminated: boolean;
  /**
   * Pareja a la que pertenece (§12.12, P28). `null` en los juegos sin
   * equipos, que son todos menos Mus.
   *
   * §12.12 lo pedía como `teamIndex: 0 | 1` obligatorio. Se implementa
   * admitiendo `null` a propósito: hacerlo obligatorio obligaría a Chinchón y
   * a Pocha a inventarse una pareja que no existe en sus reglas, y cualquier
   * valor que eligieran sería mentira para la clasificación de `/sala`,
   * `/mesa` y las estadísticas de §11.2. `null` dice la verdad — "este juego
   * no tiene parejas" — y obliga a quien lo lea a distinguir el caso.
   */
  teamIndex: 0 | 1 | null;
}

/** Campos comunes a cualquier vista, de cualquier juego. */
interface CommonViewBase {
  roomCode: RoomCode;
  status: ViewStatus;
  round: number;
  players: PublicPlayer[];
  turnPlayerId: PlayerId | null;
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

// --- Chinchón (forma idéntica a la que existía antes de P22) ----------------

export interface ChinchonCommonView extends CommonViewBase {
  gameId: 'chinchon';
  config: ChinchonConfig;
  turnPhase: TurnPhase;
  /** Instante límite del turno en ms, o null cuando se juega sin tiempo. */
  turnDeadlineAt: number | null;
  deckCount: number;
  discardTop: CardId | null;
  discardCount: number;
  roundResult: RoundResult | null; // solo en status 'roundEnd' | 'gameEnd'
}

export interface ChinchonPlayerViewMe {
  playerId: PlayerId;
  hand: CardId[]; // orden tal y como lo dejó el jugador
  bestMelds: CardId[][]; // sugerencia calculada por el servidor
  deadwood: number; // puntos sueltos con la mejor combinación
  canClose: boolean; // si descartando alguna carta podría cerrar
  closableDiscards: CardId[]; // cartas cuyo descarte permite cerrar
  lockedCardId: CardId | null; // carta robada del descarte que no puede descartar
  availableActions: AvailableAction[];
}

export interface ChinchonPlayerView extends ChinchonCommonView {
  kind: 'player';
  me: ChinchonPlayerViewMe;
}

export interface ChinchonTableView extends ChinchonCommonView {
  kind: 'table'; // sin campo 'me'. Jamás.
}

export interface RoundResultRow {
  playerId: PlayerId;
  melds: CardId[][]; // combinaciones reveladas
  leftovers: CardId[]; // cartas sueltas reveladas
  delta: number; // puntos sumados esta ronda (puede ser negativo)
  total: number; // acumulado tras la ronda
  eliminated: boolean;
}

export interface RoundResult {
  closedBy: PlayerId | null;
  chinchonBy: PlayerId | null;
  rows: RoundResultRow[];
}

// --- Pocha (nuevo en P22; resuelve el gap de vista que §10 no cubrió) -------

export interface PochaCommonView extends CommonViewBase {
  gameId: 'pocha';
  config: PochaConfig;
  /** Palo de triunfo de la ronda, o null si config.trump === false. */
  trumpSuit: Suit | null;
  /** Carta revelada para fijar el triunfo (§9.3), o null si no hay triunfo. */
  trumpCardId: CardId | null;
  /** Tamaño de la ronda en curso (nº de cartas repartidas, §9.2). */
  roundSize: number;
  dealerSeat: number;
  /** Cante de cada jugador, indexado por asiento. null = no ha cantado todavía. */
  bids: (number | null)[];
  /** Bazas ganadas por cada jugador en la ronda en curso, indexado por asiento. */
  tricksWon: number[];
  /** Cartas jugadas en la baza en curso, en el orden en que se jugaron. */
  currentTrick: { playerId: PlayerId; cardId: CardId }[];
  /** Palo que salió en la baza en curso, o null si todavía no se ha jugado ninguna carta. */
  leadSuit: Suit | null;
  roundResult: PochaRoundResult | null; // solo en status 'roundEnd' | 'gameEnd'
}

export interface PochaPlayerViewMe {
  playerId: PlayerId;
  hand: CardId[];
  /** Cartas jugables ahora mismo respetando la obligación de asistir (§9.5). Vacío si no es mi turno de baza. */
  legalCardIds: CardId[];
  availableActions: PochaAvailableAction[];
}

export interface PochaPlayerView extends PochaCommonView {
  kind: 'player';
  me: PochaPlayerViewMe;
}

export interface PochaTableView extends PochaCommonView {
  kind: 'table'; // sin campo 'me'. Jamás.
}

export interface PochaRoundResultRow {
  playerId: PlayerId;
  bid: number;
  tricksWon: number;
  delta: number; // 10+tricksWon si acertó, 0 si no (§9.7)
  total: number;
}

export interface PochaRoundResult {
  rows: PochaRoundResultRow[];
}

// --- Mus (nuevo en P28; §12.12) ---------------------------------------------
//
// Mus es el primer juego POR PAREJAS: el marcador deja de ser por jugador.
// `CommonViewBase.winnerId` no sirve (§12.12) y se envía siempre `null` en las
// vistas de Mus; el ganador de verdad va en `winnerTeamIndex`. `score` de
// `PublicPlayer` tampoco significa nada aquí y va a 0: las piedras son de la
// pareja, no del jugador, y están en `teams`.

/** Los cuatro lances, más el punto que sustituye al juego si nadie lo tiene. */
export type MusLance = 'grande' | 'chica' | 'pares' | 'juego' | 'punto';

/** Fase dentro de una mano de Mus. */
export type MusPhase =
  | 'mus' // cada uno dice mus o corta (§12.5)
  | 'descarte' // los cuatro dijeron mus: se descarta de 1 a 4 (§12.5)
  | 'declararPares' // declaración pública antes del lance de pares (§12.6)
  | 'declararJuego' // declaración pública antes del lance de juego (§12.6)
  | 'lance' // envites del lance en curso (§12.7)
  | 'recuento'; // mano terminada, cartas descubiertas (§12.9)

export type MusAvailableAction =
  | 'mus'
  | 'noMus'
  | 'descartar'
  | 'declararPares'
  | 'declararJuego'
  | 'paso'
  | 'envidar'
  | 'querer'
  | 'noQuerer'
  | 'ordago'
  | 'nextRound';

/** Marcador de una pareja. §12.3: 40 piedras = 8 amarrakos = 1 juego. */
export interface MusTeam {
  index: 0 | 1;
  piedras: number; // 0..40 dentro del juego en curso
  amarrakos: number; // floor(piedras / 5), derivado; va en la vista para no recalcularlo en cada cliente
  juegos: number; // juegos ganados de la partida (vaca, config.juegos)
}

/** Envite vivo en el lance en curso, o null si nadie ha envidado. */
export interface MusBet {
  /** Piedras apostadas. En un órdago es el juego entero: `isOrdago` manda. */
  piedras: number;
  /** Pareja que envidó y está esperando respuesta. */
  byTeam: 0 | 1;
  /** Lo que se lleva quien envidó si la contraria dice "no quiero" (§12.7). */
  ifRejected: number;
  isOrdago: boolean;
}

export interface MusCommonView extends CommonViewBase {
  gameId: 'mus';
  config: MusConfig;
  teams: MusTeam[]; // siempre 2, indexados por `index`
  /** Ganador de la PARTIDA por parejas. `winnerId` es siempre null en Mus. */
  winnerTeamIndex: 0 | 1 | null;
  manoSeat: number; // habla primero en todo (§12.4); rota una silla por mano
  phase: MusPhase;
  lance: MusLance | null; // solo con phase === 'lance'
  bet: MusBet | null;
  /** Quién dijo mus en la vuelta en curso, por asiento. null = no le ha tocado. */
  musSaid: (boolean | null)[];
  /** Declaraciones públicas de pares, por asiento. null = no ha declarado. */
  paresDeclared: (boolean | null)[];
  /** Declaraciones públicas de juego, por asiento. null = no ha declarado. */
  juegoDeclared: (boolean | null)[];
  /** Recuento de la mano. Solo en status 'roundEnd' | 'gameEnd'. */
  handResult: MusHandResult | null;
}

export interface MusPlayerViewMe {
  playerId: PlayerId;
  hand: CardId[];
  teamIndex: 0 | 1;
  /** Lo que valen sus pares ahora mismo, o null si no tiene (§12.6). Solo suyo. */
  pares: { kind: 'duples' | 'medias' | 'pareja'; piedras: number } | null;
  /** Suma de juego de su mano (§12.6) y si llega a 31. Solo suyo. */
  juego: { suma: number; tiene: boolean };
  /** Piedras mínimas que puede envidar ahora mismo, o null si no puede envidar. */
  minEnvite: number | null;
  availableActions: MusAvailableAction[];
}

export interface MusPlayerView extends MusCommonView {
  kind: 'player';
  me: MusPlayerViewMe;
}

export interface MusTableView extends MusCommonView {
  kind: 'table'; // sin campo 'me'. Jamás.
}

/** Lo que aportó un lance al recuento (§12.9). */
export interface MusLanceResultRow {
  lance: MusLance;
  /** Cómo acabó el lance: en paso, querido, no querido, o no existió. */
  outcome: 'skipped' | 'paso' | 'querido' | 'noQuerido' | 'soloUna';
  /** Pareja que se lleva las piedras del lance, o null si el lance no existió. */
  wonByTeam: 0 | 1 | null;
  /** Piedras del envite (o del "en paso") que se apuntó `wonByTeam`. */
  piedras: number;
  /** Piedras de las tablas de pares/juego/punto, indexadas por teamIndex. */
  tablas: number[];
  /** false si el recuento se cortó antes de llegar a este lance (§12.9.3). */
  counted: boolean;
}

export interface MusHandResult {
  /** Manos de los cuatro, descubiertas (§12.9). Indexadas por asiento. */
  hands: CardId[][];
  rows: MusLanceResultRow[];
  /** Piedras de cada pareja tras el recuento, indexadas por teamIndex. */
  piedras: number[];
  /** Pareja que ganó el juego en esta mano, o null si el juego sigue. */
  juegoWonByTeam: 0 | 1 | null;
  /** true si el juego se decidió por un órdago querido (§12.8). */
  byOrdago: boolean;
}

// --- Uniones públicas (§2.5, ensanchadas en P22 y P28) -----------------------

export type CommonView = ChinchonCommonView | PochaCommonView | MusCommonView;
export type PlayerView = ChinchonPlayerView | PochaPlayerView | MusPlayerView;
export type TableView = ChinchonTableView | PochaTableView | MusTableView;

// --- Esquemas zod (tipo derivado por z.infer donde coincide) -----------------
// Nota: no había (ni hay) un PlayerViewSchema/TableViewSchema en zod -- las
// vistas no se validan en el borde de red con zod (solo GameConfig y las
// acciones/eventos, que sí cruzan el borde en ambas direcciones). Solo
// PublicPlayer y RoundResult (de Chinchón) tenían esquema, y lo conservan.

export const PublicPlayerSchema = z.object({
  playerId: z.string(),
  nick: z.string(),
  seat: z.number().int().min(0).max(5),
  colorIndex: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  score: z.number().int(),
  handCount: z.number().int().min(0),
  connected: z.boolean(),
  isHost: z.boolean(),
  eliminated: z.boolean(),
  teamIndex: z.union([z.literal(0), z.literal(1)]).nullable(),
});

const cardIdList = z.array(z.string());
const meldsList = z.array(cardIdList);

export const RoundResultRowSchema = z.object({
  playerId: z.string(),
  melds: meldsList,
  leftovers: cardIdList,
  delta: z.number().int(),
  total: z.number().int(),
  eliminated: z.boolean(),
});

export const RoundResultSchema = z.object({
  closedBy: z.string().nullable(),
  chinchonBy: z.string().nullable(),
  rows: z.array(RoundResultRowSchema),
});
