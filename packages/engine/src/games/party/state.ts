// Estado compartido de los modos sociales. El motor guarda las respuestas y
// los objetivos privados; las vistas deciden qué parte puede ver cada cliente.

import type {
  CardId,
  GameConfig,
  ColorTopic,
  PartyConfig,
  PartyGameId,
  PlayerId,
  RoomCode,
  MajorityGroup,
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
  /** Grupo de Escala; null en partidas individuales y en los otros modos. */
  groupIndex: number | null;
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
  /** Se fija al responder la primera persona; null mientras nadie haya bloqueado. */
  deadlineAt: number | null;
  /** Bote que se arrastra cuando toda la mesa acierta. */
  rollover: number;
  /** Delta público de la última pregunta; null hasta revelar. */
  scoreDeltas: Record<PlayerId, number> | null;
}

export interface MajorityRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  submissions: Record<PlayerId, string>;
  majorityAnswers: string[] | null;
  /** Agrupación confirmada por el anfitrión; null mientras se revisa. */
  groups: MajorityGroup[] | null;
  /** Puntos ganados en la ronda; null mientras se revisa. */
  scoreDeltas: Record<PlayerId, number> | null;
}

export interface ScaleRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  cluePlayerId: PlayerId;
  clueGroupIndex: number | null;
  /** Orden de guías de un mismo eje en la variante por grupos. */
  clueSequence: PlayerId[];
  clueSequenceIndex: number;
  /** Número de eje; varias personas pueden jugar el mismo eje en grupos. */
  scaleSet: number;
  /** Objetivo secreto que solo se entrega al jugador guía. */
  target: number;
  /** Texto que la guía confirma y que ya puede ver el resto. */
  clueText: string | null;
  /** Plazo común para las estimaciones, iniciado al aceptar la pista. */
  deadlineAt: number | null;
  guesses: Record<PlayerId, number>;
  /** Puntos obtenidos en la última resolución. */
  scoreDeltas: Record<PlayerId, number> | null;
  /** Marcador acumulado por grupo, indexado como texto por serialización JSON. */
  groupScores: Record<string, number>;
  winnerGroupIndex: number | null;
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
  /** Jugador que conserva la vaca rosa en Mayoría, si la hay. */
  pinkCowPlayerId: PlayerId | null;
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

export function questionIdsFor(
  gameId: Exclude<PartyGameId, 'orden'>,
  colorTopic: ColorTopic = 'todo',
): string[] {
  if (gameId === 'colores') {
    return COLOR_QUESTIONS.filter(
      (question) => colorTopic === 'todo' || question.category === colorTopic,
    ).map((question) => question.id);
  }
  if (gameId === 'mayoria') return MAJORITY_QUESTIONS.map((question) => question.id);
  return SCALE_QUESTIONS.map((question) => question.id);
}
