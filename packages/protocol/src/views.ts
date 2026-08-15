// Vistas que el servidor envía al cliente (siempre censuradas). Contrato §2.5,
// ensanchado en P22 (motor de Pocha) para admitir un segundo juego.
//
// Gap encontrado durante P22 (no cubierto por §10, P21): §10 amplió GameId,
// GameConfig, GameEvent, GameAction y ERROR_CODES para Pocha, pero nunca
// diseñó la forma de su PlayerView/TableView -- CommonView (de antes de P22)
// asumía campos de Chinchón (turnPhase, deckCount, discardTop/Cards/Count) como
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
import type {
  ClassicConfig,
  ChinchonConfig,
  ColoresConfig,
  EscalaConfig,
  LaRondaConfig,
  MayoriaConfig,
  MusConfig,
  OrdenConfig,
  PochaConfig,
} from './config.ts';

export type ViewStatus = 'lobby' | 'playing' | 'roundEnd' | 'gameEnd';
export type TurnPhase = 'draw' | 'discard' | null;

/** Acción de juego disponible para el jugador en este momento (Chinchón). */
export type AvailableAction = 'drawDeck' | 'drawDiscard' | 'discard' | 'close';

/** Acción de juego disponible para el jugador en este momento (Pocha). */
export type PochaAvailableAction = 'bid' | 'playCard' | 'nextRound';

/** Los cinco clásicos añadidos como una familia de vistas homogénea. */
export type ClassicGameId = 'brisca' | 'escoba' | 'sieteymedia' | 'tute' | 'cinquillo';
export type ClassicPhase = 'trick' | 'capture' | 'draw' | 'banker' | 'layout';
export type ClassicAvailableAction =
  | 'playCard'
  | 'playCapture'
  | 'drawDeck'
  | 'stand'
  | 'pass';

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
  colorIndex: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7; // color de asiento, asignado por asiento
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
  /** Hasta las tres cartas superiores del descarte, de abajo a arriba. */
  discardCards: CardId[];
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

// --- Clásicos de baraja española -----------------------------------------

export interface ClassicCommonView extends CommonViewBase {
  gameId: ClassicGameId;
  config: ClassicConfig;
  phase: ClassicPhase;
  deckCount: number;
  trumpCardId: CardId | null;
  trumpSuit: Suit | null;
  currentTrick: { playerId: PlayerId; cardId: CardId }[];
  tableCards: CardId[];
  capturedCounts: number[];
  escobas: number[];
  bankerPlayerId: PlayerId | null;
  totals: (number | null)[];
  stoodPlayerIds: PlayerId[];
  bustPlayerIds: PlayerId[];
  /** Solo contiene manos que ya son públicas; nunca cartas activas ajenas. */
  revealedHands: { playerId: PlayerId; cards: CardId[] }[];
}

export interface ClassicPlayerViewMe {
  playerId: PlayerId;
  hand: CardId[];
  legalCardIds: CardId[];
  total: number | null;
  availableActions: ClassicAvailableAction[];
}

export interface ClassicPlayerView extends ClassicCommonView {
  kind: 'player';
  me: ClassicPlayerViewMe;
}

export interface ClassicTableView extends ClassicCommonView {
  kind: 'table';
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
  | 'reparto' // el postre confirma el reparto y el motor sirve las cartas
  | 'mus' // cada uno dice mus o corta (§12.5)
  | 'descarte' // los cuatro dijeron mus: se descarta de 1 a 4 (§12.5)
  | 'declararPares' // declaración pública antes del lance de pares (§12.6)
  | 'declararJuego' // declaración pública antes del lance de juego (§12.6)
  | 'lance' // envites del lance en curso (§12.7)
  | 'recuento'; // mano terminada, cartas descubiertas (§12.9)

export type MusAvailableAction =
  | 'repartir'
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
  postreSeat: number; // reparte; es el asiento inmediatamente anterior al mano
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

// --- Modos sociales ---------------------------------------------------------

export type PartyGameId = 'orden' | 'colores' | 'mayoria' | 'escala';
export type PartyPhase = 'input' | 'reveal';
export type PartyAvailableAction =
  | 'playNumber'
  | 'submitColors'
  | 'submitMajority'
  | 'submitScale'
  | 'setOrderCards'
  | 'endOrder'
  | 'nextRound';

export interface PartyPlayedNumber {
  playerId: PlayerId;
  value: number;
}

export interface OrdenPublic {
  gameId: 'orden';
  phase: PartyPhase;
  round: number;
  cardsPerPlayer: number;
  nextCardsPerPlayer: number;
  deckCount: number;
  highest: number;
  played: PartyPlayedNumber[];
  failure: { playerId: PlayerId; value: number; highest: number } | null;
}

export interface ColoresPublic {
  gameId: 'colores';
  phase: PartyPhase;
  questionId: string;
  prompt: string;
  allowMultiple: boolean;
  /** Número exacto de fichas que hay que bloquear para responder. */
  answerCount: number;
  /** Empieza con la primera respuesta y lo fija el servidor. */
  deadlineAt: number | null;
  /** Puntos acumulados porque toda la mesa acertó preguntas anteriores. */
  rollover: number;
  submittedPlayerIds: PlayerId[];
  correctColors: string[] | null;
  answers: Record<PlayerId, string[]> | null;
  /** Puntos obtenidos en esta pregunta; solo existe durante la revelación. */
  scoreDeltas: Record<PlayerId, number> | null;
}

export interface MayoriaPublic {
  gameId: 'mayoria';
  phase: PartyPhase;
  questionId: string;
  prompt: string;
  submittedPlayerIds: PlayerId[];
  answers: Record<PlayerId, string> | null;
  majorityAnswers: string[] | null;
}

export interface EscalaPublic {
  gameId: 'escala';
  phase: PartyPhase;
  questionId: string;
  leftLabel: string;
  rightLabel: string;
  cluePlayerId: PlayerId;
  target: number | null;
  guesses: Record<PlayerId, number> | null;
}

export type PartyPublic = OrdenPublic | ColoresPublic | MayoriaPublic | EscalaPublic;

export interface PartyPlayerViewMe {
  playerId: PlayerId;
  /** Solo contiene números en Orden; en los otros modos queda vacío. */
  hand: number[];
  submitted: boolean;
  /** Solo se rellena para quien da la pista en Escala. */
  scaleTarget: number | null;
  availableActions: PartyAvailableAction[];
}

interface PartyCommonViewBase extends CommonViewBase {
  phase: PartyPhase;
  party: PartyPublic;
}

export interface OrdenCommonView extends PartyCommonViewBase {
  gameId: 'orden';
  config: OrdenConfig;
  party: OrdenPublic;
}

export interface ColoresCommonView extends PartyCommonViewBase {
  gameId: 'colores';
  config: ColoresConfig;
  party: ColoresPublic;
}

export interface MayoriaCommonView extends PartyCommonViewBase {
  gameId: 'mayoria';
  config: MayoriaConfig;
  party: MayoriaPublic;
}

export interface EscalaCommonView extends PartyCommonViewBase {
  gameId: 'escala';
  config: EscalaConfig;
  party: EscalaPublic;
}

export type PartyCommonView =
  | OrdenCommonView
  | ColoresCommonView
  | MayoriaCommonView
  | EscalaCommonView;

export interface OrdenPlayerView extends OrdenCommonView {
  kind: 'player';
  me: PartyPlayerViewMe;
}

export interface ColoresPlayerView extends ColoresCommonView {
  kind: 'player';
  me: PartyPlayerViewMe;
}

export interface MayoriaPlayerView extends MayoriaCommonView {
  kind: 'player';
  me: PartyPlayerViewMe;
}

export interface EscalaPlayerView extends EscalaCommonView {
  kind: 'player';
  me: PartyPlayerViewMe;
}

export type PartyPlayerView =
  | OrdenPlayerView
  | ColoresPlayerView
  | MayoriaPlayerView
  | EscalaPlayerView;

export interface OrdenTableView extends OrdenCommonView {
  kind: 'table';
}

export interface ColoresTableView extends ColoresCommonView {
  kind: 'table';
}

export interface MayoriaTableView extends MayoriaCommonView {
  kind: 'table';
}

export interface EscalaTableView extends EscalaCommonView {
  kind: 'table';
}

export type PartyTableView =
  | OrdenTableView
  | ColoresTableView
  | MayoriaTableView
  | EscalaTableView;

// --- La Ronda --------------------------------------------------------------

export type RondaTapaType = 'carne' | 'pescado' | 'vegetal';
export type RondaCardKind =
  | 'tapa'
  | 'vino'
  | 'bloqueo'
  | 'giro'
  | 'premium'
  | 'toilette'
  | 'sobremesa'
  | 'celebracion'
  | 'mitad'
  | 'grupo'
  | 'servicio';
export type RondaPhase = 'ordering' | 'billChoice' | 'tips' | 'discard';
export type RondaBillMode = 'solo' | 'half' | 'group';
export type RondaAvailableAction =
  | 'playRondaCard'
  | 'askRondaBill'
  | 'skipRondaTurn'
  | 'chooseRondaBillMode'
  | 'playRondaTip'
  | 'passRondaBill'
  | 'confirmRondaDiscards'
  | 'nextRound';

export interface RondaCardView {
  id: string;
  kind: RondaCardKind;
  name: string;
  description: string;
  priceCents: number;
  tapaType: RondaTapaType | null;
}

export interface RondaPlayedTapa {
  cardId: string;
  name: string;
  priceCents: number;
  effectivePriceCents: number;
  premium: boolean;
}

export interface RondaTapasPile {
  type: RondaTapaType;
  blocked: boolean;
  topPriceCents: number | null;
  cards: RondaPlayedTapa[];
}

export interface RondaRoundResult {
  requesterId: PlayerId;
  totalCents: number;
  mode: RondaBillMode;
  payments: {
    playerId: PlayerId;
    amountCents: number;
    balanceCents: number;
  }[];
  handIncrease: number;
}

export interface RondaCommonView extends CommonViewBase {
  gameId: 'laronda';
  config: LaRondaConfig;
  phase: RondaPhase;
  direction: 1 | -1;
  orderingCardCount: number;
  deckCount: number;
  tapas: RondaTapasPile[];
  wineCount: number;
  wineCostCents: number;
  publicCards: RondaCardView[];
  ordersClosed: boolean;
  billPreviewCents: number;
  billRequesterId: PlayerId | null;
  billMode: RondaBillMode | null;
  billTargetId: PlayerId | null;
  billResponderId: PlayerId | null;
  passedPlayerIds: PlayerId[];
  protectedPlayerIds: PlayerId[];
  roundResult: RondaRoundResult | null;
  winnerIds: PlayerId[];
}

export interface RondaPlayerViewMe {
  playerId: PlayerId;
  hand: RondaCardView[];
  legalCardIds: string[];
  legalTargetTypes: RondaTapaType[];
  legalTargetPlayerIds: PlayerId[];
  availableBillModes: RondaBillMode[];
  availableActions: RondaAvailableAction[];
}

export interface RondaPlayerView extends RondaCommonView {
  kind: 'player';
  me: RondaPlayerViewMe;
}

export interface RondaTableView extends RondaCommonView {
  kind: 'table';
}

// --- Uniones públicas (§2.5, ensanchadas en P22, P28 y modos sociales) ------

export type CommonView =
  | ChinchonCommonView
  | PochaCommonView
  | MusCommonView
  | ClassicCommonView
  | PartyCommonView
  | RondaCommonView;
export type PlayerView =
  | ChinchonPlayerView
  | PochaPlayerView
  | MusPlayerView
  | ClassicPlayerView
  | PartyPlayerView
  | RondaPlayerView;
export type TableView =
  | ChinchonTableView
  | PochaTableView
  | MusTableView
  | ClassicTableView
  | PartyTableView
  | RondaTableView;

// --- Esquemas zod (tipo derivado por z.infer donde coincide) -----------------
// Nota: no había (ni hay) un PlayerViewSchema/TableViewSchema en zod -- las
// vistas no se validan en el borde de red con zod (solo GameConfig y las
// acciones/eventos, que sí cruzan el borde en ambas direcciones). Solo
// PublicPlayer y RoundResult (de Chinchón) tenían esquema, y lo conservan.

export const PublicPlayerSchema = z.object({
  playerId: z.string(),
  nick: z.string(),
  seat: z.number().int().min(0).max(7),
  colorIndex: z.union([
    z.literal(0),
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
    z.literal(7),
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
