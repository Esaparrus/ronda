import type {
  CardId,
  ClassicConfig,
  ClassicGameId,
  ClassicPhase,
  PlayerId,
  RoomCode,
  Suit,
} from '@ronda/protocol';

export interface ClassicPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number;
  score: number;
  left: boolean;
  hand: CardId[];
  captured: CardId[];
  escobas: number;
  stood: boolean;
  bust: boolean;
  revealed: boolean;
  bonus: number;
  sungSuits: Suit[];
}

export interface ClassicState {
  version: number;
  status: 'playing' | 'gameEnd';
  phase: ClassicPhase;
  config: ClassicConfig;
  gameId: ClassicGameId;
  roomCode: RoomCode;
  rng: { seed: string; calls: number };
  round: number;
  dealerSeat: number;
  bankerSeat: number | null;
  turnSeat: number | null;
  deck: CardId[];
  trumpCardId: CardId | null;
  trumpSuit: Suit | null;
  currentTrick: { seat: number; cardId: CardId }[];
  tableCards: CardId[];
  lastCapturerSeat: number | null;
  players: ClassicPlayer[];
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

/** Cinquillo conserva su variante horaria; los demás clásicos avanzan a la derecha. */
export function seatAtTurnOffset(state: ClassicState, seat: number, offset: number): number {
  const direction = state.gameId === 'cinquillo' ? 1 : -1;
  return (seat + direction * offset + state.players.length * 2) % state.players.length;
}

export function nextActiveSeat(state: ClassicState, seat: number): number | null {
  for (let offset = 1; offset <= state.players.length; offset++) {
    const candidate = seatAtTurnOffset(state, seat, offset);
    if (state.players[candidate] && !state.players[candidate].left) return candidate;
  }
  return null;
}

export function findPlayer(state: ClassicState, playerId: PlayerId): ClassicPlayer | undefined {
  return state.players.find((player) => player.playerId === playerId);
}
