import type {
  GameConfig,
  PlayerId,
  PrecioJustoConfig,
  RoomCode,
} from '@ronda/protocol';
import type { PriceQuestion } from './content.ts';

export type PrecioJustoStatus = 'playing' | 'gameEnd';
export type PrecioJustoPhase = 'input' | 'reveal';

export interface PrecioJustoPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number;
  isBot?: boolean;
  score: number;
  left: boolean;
  hand: string[];
}

export interface PrecioJustoGuessResult {
  priceCents: number | null;
  differenceCents: number | null;
  relativeErrorPercent: number | null;
  points: number;
}

export interface PrecioJustoRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  submissions: Record<PlayerId, number>;
  deadlineAt: number | null;
  scoreDeltas: Record<PlayerId, number> | null;
  results: Record<PlayerId, PrecioJustoGuessResult> | null;
}

export interface PrecioJustoRngState {
  seed: string;
  calls: number;
}

export interface PrecioJustoState {
  version: number;
  status: PrecioJustoStatus;
  phase: PrecioJustoPhase;
  config: PrecioJustoConfig;
  gameId: 'preciojusto';
  roomCode: RoomCode;
  rng: PrecioJustoRngState;
  round: number;
  turnSeat: null;
  players: PrecioJustoPlayer[];
  /** Catálogo congelado al iniciar esta partida (local o Amazon). */
  questions: PriceQuestion[];
  price: PrecioJustoRoundState;
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

export function activePlayers(state: PrecioJustoState): PrecioJustoPlayer[] {
  return state.players.filter((player) => !player.left);
}

export function findPlayer(
  state: PrecioJustoState,
  playerId: PlayerId,
): PrecioJustoPlayer | undefined {
  return state.players.find((player) => player.playerId === playerId);
}

export function precioJustoConfigForGame(config: GameConfig): PrecioJustoConfig {
  if (config.gameId !== 'preciojusto') {
    throw new Error(`La configuración ${config.gameId} no corresponde a Precio justo`);
  }
  return config;
}
