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
import type { ChinchonConfig, PochaConfig } from './config.ts';

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
  seat: number; // 0..3 en Chinchón; 0..5 en Pocha
  colorIndex: 0 | 1 | 2 | 3 | 4 | 5; // color de asiento, asignado por asiento
  score: number; // acumulado de la partida
  handCount: number; // nº de cartas, nunca cuáles
  connected: boolean;
  isHost: boolean;
  eliminated: boolean;
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

// --- Uniones públicas (§2.5, ensanchadas en P22) -----------------------------

export type CommonView = ChinchonCommonView | PochaCommonView;
export type PlayerView = ChinchonPlayerView | PochaPlayerView;
export type TableView = ChinchonTableView | PochaTableView;

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
