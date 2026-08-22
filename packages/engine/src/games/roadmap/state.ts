import type {
  BanderasConfig,
  CifrasConfig,
  CompletaLaFraseConfig,
  GameConfig,
  PlayerId,
  QuienLoHariaConfig,
  RoomCode,
} from '@ronda/protocol';
import type { CifrasQuestion, FlagQuestion, SentenceQuestion, WhoQuestion } from './content.ts';

export type RoadmapStatus = 'playing' | 'gameEnd';
export type RoadmapPhase = 'input' | 'reveal';

export interface RoadmapRngState {
  seed: string;
  calls: number;
}

export interface RoadmapPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number;
  /** Compatibilidad con los contratos de sala que comparten el campo hand. */
  hand: string[];
  score: number;
  left: boolean;
  isBot: boolean;
}

export interface RoadmapBaseState {
  version: number;
  status: RoadmapStatus;
  phase: RoadmapPhase;
  roomCode: RoomCode;
  rng: RoadmapRngState;
  round: number;
  turnSeat: null;
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
  players: RoadmapPlayer[];
}

export interface FlagRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  submissions: Record<PlayerId, string>;
  deadlineAt: number | null;
  scoreDeltas: Record<PlayerId, number> | null;
}

export interface BanderasState extends RoadmapBaseState {
  gameId: 'banderas';
  config: BanderasConfig;
  questions: FlagQuestion[];
  flags: FlagRoundState;
}

export interface CifrasRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  submissions: Record<PlayerId, number>;
  orderSubmissions: Record<PlayerId, string[]>;
  deadlineAt: number | null;
  scoreDeltas: Record<PlayerId, number> | null;
  estimateResults: Record<PlayerId, { value: number | null; errorPercent: number | null; points: number }> | null;
  orderResults: Record<PlayerId, { order: string[] | null; correctOrder: string[]; correctPositions: number; points: number }> | null;
}

export interface CifrasState extends RoadmapBaseState {
  gameId: 'cifras';
  config: CifrasConfig;
  questions: CifrasQuestion[];
  cifras: CifrasRoundState;
}

export interface WhoRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  submissions: Record<PlayerId, PlayerId>;
  deadlineAt: number | null;
  scoreDeltas: Record<PlayerId, number> | null;
  voteCounts: Record<PlayerId, number> | null;
}

export interface WhoHistoryEntry {
  round: number;
  questionId: string;
  votes: Record<PlayerId, PlayerId>;
  voteCounts: Record<PlayerId, number>;
  winners: PlayerId[];
}

export interface QuienLoHariaState extends RoadmapBaseState {
  gameId: 'quienloharia';
  config: QuienLoHariaConfig;
  questions: WhoQuestion[];
  who: WhoRoundState;
  history: WhoHistoryEntry[];
}

export interface SentenceRoundState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  submissions: Record<PlayerId, string>;
  hintUsed: Record<PlayerId, boolean>;
  deadlineAt: number | null;
  scoreDeltas: Record<PlayerId, number> | null;
  results: Record<PlayerId, { answer: string | null; correct: boolean; points: number; hintUsed: boolean }> | null;
}

export interface CompletaLaFraseState extends RoadmapBaseState {
  gameId: 'completalafrase';
  config: CompletaLaFraseConfig;
  questions: SentenceQuestion[];
  sentence: SentenceRoundState;
}

export type RoadmapState = BanderasState | CifrasState | QuienLoHariaState | CompletaLaFraseState;
export type RoadmapGameId = RoadmapState['gameId'];

export function activePlayers(state: RoadmapState): RoadmapPlayer[] {
  return state.players.filter((player) => !player.left);
}

export function findPlayer(state: RoadmapState, playerId: PlayerId): RoadmapPlayer | undefined {
  return state.players.find((player) => player.playerId === playerId);
}

export function isRoadmapGame(gameId: GameConfig['gameId']): gameId is RoadmapGameId {
  return (
    gameId === 'banderas' ||
    gameId === 'cifras' ||
    gameId === 'quienloharia' ||
    gameId === 'completalafrase'
  );
}
