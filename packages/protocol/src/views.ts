// Vistas que el servidor envía al cliente (siempre censuradas). Contrato §2.5.
//
// Invariante de seguridad (verificable con un test, §2.5 final):
//   serializar una TableView o una PlayerView y comprobar que no aparece ningún
//   CardId de la mano de otro jugador, salvo dentro de roundResult cuando
//   status !== 'playing'.
import { z } from 'zod';
import type { CardId, GameId, PlayerId, RoomCode } from './ids.ts';
import type { GameConfig } from './config.ts';

export type ViewStatus = 'lobby' | 'playing' | 'roundEnd' | 'gameEnd';
export type TurnPhase = 'draw' | 'discard' | null;

/** Acción de juego disponible para el jugador en este momento. */
export type AvailableAction = 'drawDeck' | 'drawDiscard' | 'discard' | 'close';

export interface PublicPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number; // 0..3
  colorIndex: 0 | 1 | 2 | 3; // color de asiento, asignado por asiento
  score: number; // acumulado de la partida
  handCount: number; // nº de cartas, nunca cuáles
  connected: boolean;
  isHost: boolean;
  eliminated: boolean;
}

export interface CommonView {
  roomCode: RoomCode;
  gameId: GameId;
  config: GameConfig;
  status: ViewStatus;
  round: number;
  players: PublicPlayer[];
  turnPlayerId: PlayerId | null;
  turnPhase: TurnPhase;
  deckCount: number;
  discardTop: CardId | null;
  discardCount: number;
  roundResult: RoundResult | null; // solo en status 'roundEnd' | 'gameEnd'
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

export interface PlayerViewMe {
  playerId: PlayerId;
  hand: CardId[]; // orden tal y como lo dejó el jugador
  bestMelds: CardId[][]; // sugerencia calculada por el servidor
  deadwood: number; // puntos sueltos con la mejor combinación
  canClose: boolean; // si descartando alguna carta podría cerrar
  closableDiscards: CardId[]; // cartas cuyo descarte permite cerrar
  lockedCardId: CardId | null; // carta robada del descarte que no puede descartar
  availableActions: AvailableAction[];
}

export interface PlayerView extends CommonView {
  kind: 'player';
  me: PlayerViewMe;
}

export interface TableView extends CommonView {
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

// --- Esquemas zod (tipo derivado por z.infer donde coincide) -----------------

export const PublicPlayerSchema = z.object({
  playerId: z.string(),
  nick: z.string(),
  seat: z.number().int().min(0).max(3),
  colorIndex: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
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
