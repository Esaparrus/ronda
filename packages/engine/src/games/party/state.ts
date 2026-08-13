// Estado compartido de los modos sociales. El motor guarda las respuestas y
// los objetivos privados; las vistas deciden qué parte puede ver cada cliente.

import type {
  CardId,
  GameConfig,
  PartyConfig,
  PartyGameId,
  PlayerId,
  RoomCode,
} from '@ronda/protocol';
import { COLOR_QUESTIONS, MAJORITY_QUESTIONS, SCALE_QUESTIONS } from './content.ts';

export type PartyStatus = 'playing' | 'gameEnd';
export type PartyPhase = 'input' | 'reveal';

export interface PartyRngState {
  seed: string;
  calls: number;
}

export interface PartyPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number;
  score: number;
  left: boolean;
  /** En Orden son números serializados como CardId; en los demás modos está vacío. */
  hand: CardId[];
}

export interface OrderFailure {
  playerId: PlayerId;
  value: number;
  highest: number;
}

export interface OrdenRoundState {
  cardsPerPlayer: number;
  nextCardsPerPlayer: number;
  highest: number;
  played: { playerId: PlayerId; value: number }[];
  failure: OrderFailure | null;
  /** Números todavía no repartidos en rondas futuras. Es privado del motor. */
  numberDeck: number[];
}

export interface ColorsRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  submissions: Record<PlayerId, string[]>;
}

export interface MajorityRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  submissions: Record<PlayerId, string>;
  majorityAnswers: string[] | null;
}

export interface ScaleRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  cluePlayerId: PlayerId;
  /** Objetivo secreto que solo se entrega al jugador guía. */
  target: number;
  guesses: Record<PlayerId, number>;
}

export interface PartyState {
  version: number;
  status: PartyStatus;
  phase: PartyPhase;
  config: PartyConfig;
  gameId: PartyGameId;
  roomCode: RoomCode;
  rng: PartyRngState;
  /** En Orden es el número de reparto; en los demás modos es la pregunta. */
  round: number;
  /** Siempre null: los modos sociales no tienen turnos. Se incluye para que
   * el estado siga siendo cómodo de inspeccionar junto a los otros motores. */
  turnSeat: null;
  players: PartyPlayer[];
  order: OrdenRoundState | null;
  colors: ColorsRoundState | null;
  majority: MajorityRoundState | null;
  scale: ScaleRoundState | null;
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

export function activePlayers(state: PartyState): PartyPlayer[] {
  return state.players.filter((player) => !player.left);
}

export function findPlayer(state: PartyState, playerId: PlayerId): PartyPlayer | undefined {
  return state.players.find((player) => player.playerId === playerId);
}

/** Convierte la configuración general en la configuración del modo esperado. */
export function partyConfigForGame(config: GameConfig, gameId: PartyGameId): PartyConfig {
  if (config.gameId !== gameId) {
    throw new Error(`La configuración ${config.gameId} no corresponde a ${gameId}`);
  }
  return config;
}

export function questionIdsFor(gameId: Exclude<PartyGameId, 'orden'>): string[] {
  if (gameId === 'colores') return COLOR_QUESTIONS.map((question) => question.id);
  if (gameId === 'mayoria') return MAJORITY_QUESTIONS.map((question) => question.id);
  return SCALE_QUESTIONS.map((question) => question.id);
}
