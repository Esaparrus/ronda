import type {
  BanderasConfig,
  CifrasConfig,
  CompletaLaFraseConfig,
  QuienLoHariaConfig,
} from './config.ts';
import type { PlayerId, RoomCode } from './ids.ts';
import type { PublicPlayer, ViewStatus } from './views.ts';

/** Contratos públicos de los cuatro juegos de preguntas del roadmap. */
export type RoadmapGameId = 'banderas' | 'cifras' | 'quienloharia' | 'completalafrase';
export type RoadmapPhase = 'input' | 'reveal';

export type RoadmapAvailableAction =
  | 'submitFlag'
  | 'finishFlags'
  | 'submitNumber'
  | 'submitOrder'
  | 'submitChoice'
  | 'finishCifras'
  | 'submitWhoVote'
  | 'finishWho'
  | 'useSentenceHint'
  | 'submitSentence'
  | 'finishSentence'
  | 'nextRound';

interface RoadmapCommonViewBase {
  roomCode: RoomCode;
  status: ViewStatus;
  round: number;
  players: PublicPlayer[];
  turnPlayerId: null;
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

export interface FlagOptionPublic {
  id: string;
  label: string;
}

export interface BanderasPublic {
  gameId: 'banderas';
  phase: RoadmapPhase;
  questionId: string;
  image: string;
  entityName: string | null;
  entityType: 'country' | 'community' | 'territory' | null;
  region: string;
  difficulty: string;
  options: FlagOptionPublic[];
  explanation: string | null;
  correctOptionId: string | null;
  deadlineAt: number | null;
  submittedPlayerIds: PlayerId[];
  answers: Record<PlayerId, string | null> | null;
  scoreDeltas: Record<PlayerId, number> | null;
}

export interface BanderasCommonView extends RoadmapCommonViewBase {
  gameId: 'banderas';
  config: BanderasConfig;
  phase: RoadmapPhase;
  flags: BanderasPublic;
}

export interface BanderasPlayerViewMe {
  playerId: PlayerId;
  selectedOptionId: string | null;
  submitted: boolean;
  availableActions: RoadmapAvailableAction[];
}

export interface BanderasPlayerView extends BanderasCommonView {
  kind: 'player';
  me: BanderasPlayerViewMe;
}

export interface BanderasTableView extends BanderasCommonView {
  kind: 'table';
}

export interface CifrasItemPublic {
  id: string;
  label: string;
}

export interface CifrasEstimateReveal {
  value: number | null;
  errorPercent: number | null;
  points: number;
}

export interface CifrasOrderReveal {
  order: string[] | null;
  correctOrder: string[];
  correctPositions: number;
  points: number;
}

export interface CifrasChoiceReveal {
  selectedOptionId: string | null;
  correctOptionId: string;
  correct: boolean;
  points: number;
}

export interface CifrasPublic {
  gameId: 'cifras';
  phase: RoadmapPhase;
  questionId: string;
  kind: 'estimate' | 'order' | 'compare';
  prompt: string;
  unit: string;
  definition: string;
  category: string;
  direction: 'asc' | 'desc' | null;
  items: CifrasItemPublic[];
  referenceValue: number | null;
  itemValues: Record<string, number> | null;
  source: string | null;
  updatedAt: string | null;
  deadlineAt: number | null;
  submittedPlayerIds: PlayerId[];
  estimates: Record<PlayerId, CifrasEstimateReveal> | null;
  orders: Record<PlayerId, CifrasOrderReveal> | null;
  choices: Record<PlayerId, CifrasChoiceReveal> | null;
  scoreDeltas: Record<PlayerId, number> | null;
}

export interface CifrasCommonView extends RoadmapCommonViewBase {
  gameId: 'cifras';
  config: CifrasConfig;
  phase: RoadmapPhase;
  cifras: CifrasPublic;
}

export interface CifrasPlayerViewMe {
  playerId: PlayerId;
  submitted: boolean;
  selectedOrder: string[];
  selectedChoiceId: string | null;
  availableActions: RoadmapAvailableAction[];
}

export interface CifrasPlayerView extends CifrasCommonView {
  kind: 'player';
  me: CifrasPlayerViewMe;
}

export interface CifrasTableView extends CifrasCommonView {
  kind: 'table';
}

export interface WhoSummary {
  voteTotals: Record<PlayerId, number>;
  mostChosenPlayerIds: PlayerId[];
  leastChosenPlayerIds: PlayerId[];
  maxSingleRound: number;
  tieRounds: number[];
}

export interface QuienLoHariaPublic {
  gameId: 'quienloharia';
  phase: RoadmapPhase;
  questionId: string;
  prompt: string;
  pack: string;
  allowSelfVote: boolean;
  resultsVisible: boolean;
  deadlineAt: number | null;
  submittedPlayerIds: PlayerId[];
  votes: Record<PlayerId, PlayerId> | null;
  voteCounts: Record<PlayerId, number> | null;
  scoreDeltas: Record<PlayerId, number> | null;
  summary: WhoSummary | null;
}

export interface QuienLoHariaCommonView extends RoadmapCommonViewBase {
  gameId: 'quienloharia';
  config: QuienLoHariaConfig;
  phase: RoadmapPhase;
  who: QuienLoHariaPublic;
}

export interface QuienLoHariaPlayerViewMe {
  playerId: PlayerId;
  selectedPlayerId: PlayerId | null;
  submitted: boolean;
  availableActions: RoadmapAvailableAction[];
}

export interface QuienLoHariaPlayerView extends QuienLoHariaCommonView {
  kind: 'player';
  me: QuienLoHariaPlayerViewMe;
}

export interface QuienLoHariaTableView extends QuienLoHariaCommonView {
  kind: 'table';
}

export interface SentenceAnswerReveal {
  answer: string | null;
  correct: boolean;
  points: number;
  hintUsed: boolean;
}

export interface CompletaLaFrasePublic {
  gameId: 'completalafrase';
  phase: RoadmapPhase;
  questionId: string;
  prompt: string;
  category: string;
  author: string | null;
  source: string | null;
  hint: string | null;
  deadlineAt: number | null;
  canonicalAnswer: string | null;
  submittedPlayerIds: PlayerId[];
  answers: Record<PlayerId, SentenceAnswerReveal> | null;
  scoreDeltas: Record<PlayerId, number> | null;
}

export interface CompletaLaFraseCommonView extends RoadmapCommonViewBase {
  gameId: 'completalafrase';
  config: CompletaLaFraseConfig;
  phase: RoadmapPhase;
  sentence: CompletaLaFrasePublic;
}

export interface CompletaLaFrasePlayerViewMe {
  playerId: PlayerId;
  submitted: boolean;
  hintUsed: boolean;
  availableActions: RoadmapAvailableAction[];
}

export interface CompletaLaFrasePlayerView extends CompletaLaFraseCommonView {
  kind: 'player';
  me: CompletaLaFrasePlayerViewMe;
}

export interface CompletaLaFraseTableView extends CompletaLaFraseCommonView {
  kind: 'table';
}

export type RoadmapCommonView =
  | BanderasCommonView
  | CifrasCommonView
  | QuienLoHariaCommonView
  | CompletaLaFraseCommonView;
export type RoadmapPlayerView =
  | BanderasPlayerView
  | CifrasPlayerView
  | QuienLoHariaPlayerView
  | CompletaLaFrasePlayerView;
export type RoadmapTableView =
  | BanderasTableView
  | CifrasTableView
  | QuienLoHariaTableView
  | CompletaLaFraseTableView;
