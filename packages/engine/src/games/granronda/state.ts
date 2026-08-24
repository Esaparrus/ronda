import type {
  GranRondaBoardSpace,
  GranRondaConfig,
  GranRondaResolutionKind,
  GranRondaPowerupType,
  GranRondaMiniGameId,
  PlayerId,
  RoomCode,
} from '@ronda/protocol';
import type { ClassicState } from '../classics/state.ts';
import type { ChinchonState } from '../chinchon/state.ts';
import type { PochaState } from '../pocha/state.ts';
import type { MusicalState } from '../musical/state.ts';
import type { PartyState } from '../party/state.ts';
import type { PrecioJustoState } from '../preciojusto/state.ts';
import type { RoadmapState } from '../roadmap/state.ts';
import type { RondaState } from '../laronda/state.ts';

export type GranRondaStatus = 'playing' | 'gameEnd';
export type GranRondaPhase =
  | 'movement'
  | 'routeChoice'
  | 'moving'
  | 'resolving'
  | 'roundEnd'
  | 'minigameInput'
  | 'minigameReveal';

export interface GranRondaRngState {
  seed: string;
  calls: number;
}

export interface GranRondaPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number;
  isBot: boolean;
  /** Campo vacío para mantener la forma común de los estados de sala. */
  hand: string[];
  position: string;
  coins: number;
  seals: number;
  powerups: Record<GranRondaPowerupType, number>;
  /** Alias de marcador para las estadísticas comunes de la sala. */
  score: number;
  lastRoll: number | null;
  lastSpaceId: string | null;
  left: boolean;
}

export interface GranRondaMiniGameState {
  questionOrder: GranRondaMiniGameId[];
  questionIndex: number;
  questionId: GranRondaMiniGameId;
  submissions: Record<PlayerId, string>;
  playerStates: Record<PlayerId, GranRondaMiniPlayerState>;
  targetOptionId: string | null;
  scoreDeltas: Record<PlayerId, number> | null;
  results: Record<PlayerId, GranRondaMiniGameResult> | null;
  embeddedGame: GranRondaEmbeddedGameState | null;
}

export type GranRondaEmbeddedGameState =
  | ChinchonState
  | PochaState
  | ClassicState
  | MusicalState
  | PartyState
  | PrecioJustoState
  | RoadmapState
  | RondaState;

export interface GranRondaMiniPlayerState {
  score: number;
  lastCard: number | null;
  finished: boolean;
  busted: boolean;
  actions: number;
  completedAt: number | null;
}

export interface GranRondaMiniGameResult {
  rank: number;
  score: number;
  reward: number;
  outcome: 'winner' | 'podium' | 'bust' | 'participant';
}

export interface GranRondaMovementState {
  playerId: PlayerId;
  roll: number;
  dice: number[];
  path: string[];
  remainingSteps: number;
  routeOptions: string[];
  forcedNextSpaceId: string | null;
}

export interface GranRondaResolutionState {
  kind: GranRondaResolutionKind;
  spaceId: string;
  title: string;
  message: string;
  coinsDelta: number;
  sealsDelta: number;
}

export interface GranRondaState {
  version: number;
  status: GranRondaStatus;
  phase: GranRondaPhase;
  config: GranRondaConfig;
  gameId: 'granronda';
  roomCode: RoomCode;
  rng: GranRondaRngState;
  round: number;
  turnSeat: number | null;
  players: GranRondaPlayer[];
  board: GranRondaBoardSpace[];
  stampSpaceId: string;
  movedPlayerIds: PlayerId[];
  movement: GranRondaMovementState | null;
  resolution: GranRondaResolutionState | null;
  miniGame: GranRondaMiniGameState;
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

export function activeGranRondaPlayers(state: GranRondaState): GranRondaPlayer[] {
  return state.players.filter((player) => !player.left);
}

export function granRondaPlayer(
  state: GranRondaState,
  playerId: PlayerId,
): GranRondaPlayer | undefined {
  return state.players.find((player) => player.playerId === playerId);
}
