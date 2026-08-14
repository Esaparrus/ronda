import type {
  LaRondaConfig,
  PlayerId,
  RondaBillMode,
  RondaPhase,
  RondaRoundResult,
  RondaTapaType,
  RoomCode,
} from '@ronda/protocol';

export interface RondaPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number;
  /** Los ahorros también son la puntuación pública; siempre se expresan en céntimos. */
  score: number;
  hand: string[];
  handLimit: number;
  toilette: boolean;
  celebration: boolean;
  left: boolean;
}

export interface RondaPlayedTapaState {
  cardId: string;
  priceCents: number;
  effectivePriceCents: number;
  premiumCardId: string | null;
}

export interface RondaBillState {
  requesterSeat: number;
  mode: RondaBillMode | null;
  targetSeat: number | null;
  responderSeats: number[];
  responderIndex: number;
  passCount: number;
  passedSeats: number[];
  tipCardIds: string[];
}

export interface RondaState {
  version: number;
  status: 'playing' | 'roundEnd' | 'gameEnd';
  phase: RondaPhase;
  config: LaRondaConfig;
  gameId: 'laronda';
  roomCode: RoomCode;
  rng: { seed: string; calls: number };
  round: number;
  turnSeat: number | null;
  direction: 1 | -1;
  players: RondaPlayer[];
  deck: string[];
  discard: string[];
  tapas: Record<RondaTapaType, RondaPlayedTapaState[]>;
  blockedTypes: RondaTapaType[];
  wineCardIds: string[];
  publicSpecialCardIds: string[];
  playedCardIds: string[];
  orderingCardCount: number;
  ordersClosed: boolean;
  bill: RondaBillState | null;
  roundResult: RondaRoundResult | null;
  winnerId: PlayerId | null;
  winnerIds: PlayerId[];
  rematchVotes: PlayerId[];
}

export const RONDA_TAPA_TYPES: readonly RondaTapaType[] = ['carne', 'pescado', 'vegetal'];

export function activeRondaPlayers(state: RondaState): RondaPlayer[] {
  return state.players.filter((player) => !player.left);
}

export function rondaPlayer(state: RondaState, playerId: PlayerId): RondaPlayer | undefined {
  return state.players.find((player) => player.playerId === playerId);
}

export function nextRondaSeat(state: RondaState, fromSeat: number): number | null {
  for (let offset = 1; offset <= state.players.length; offset += 1) {
    const seat =
      (fromSeat + state.direction * offset + state.players.length * 2) % state.players.length;
    const player = state.players[seat];
    if (player && !player.left) return seat;
  }
  return null;
}
