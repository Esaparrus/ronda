import type { GranRondaConfig, GranRondaBoardSpace, PlayerId, RoomCode } from '@ronda/protocol';

export type GranRondaStatus = 'playing' | 'gameEnd';
export type GranRondaPhase = 'movement' | 'routeChoice' | 'minigameInput' | 'minigameReveal';

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
  /** Alias de marcador para las estadísticas comunes de la sala. */
  score: number;
  lastRoll: number | null;
  lastSpaceId: string | null;
  left: boolean;
}

export interface GranRondaMiniGameState {
  questionOrder: string[];
  questionIndex: number;
  questionId: string;
  submissions: Record<PlayerId, string>;
  scoreDeltas: Record<PlayerId, number> | null;
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
