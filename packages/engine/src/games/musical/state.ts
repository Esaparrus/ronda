// Estado del juego Musical. Las previews son públicas para reproducirlas en
// cada móvil; la respuesta completa de la pista solo sale en la revelación.

import type { GameConfig, MusicalConfig, MusicalTrack, PlayerId, RoomCode } from '@ronda/protocol';

export type MusicalStatus = 'playing' | 'gameEnd';
export type MusicalPhase = 'setup' | 'playing' | 'reveal';

export interface MusicalGuess {
  artist: string;
  title: string;
  year: number | null;
  correct: boolean;
}

export interface MusicalPlayer {
  playerId: PlayerId;
  nick: string;
  seat: number;
  isBot?: boolean;
  score: number;
  left: boolean;
  /** Campo vacío para mantener la forma cómoda de inspeccionar jugadores. */
  hand: string[];
  /** Marcas privadas del reproductor de este jugador en modo online. */
  onlineClipStartedAt: number | null;
  onlineClipResolvedAt: number | null;
  onlineClipElapsedMs: number | null;
}

export interface MusicalRoundResultState {
  track: MusicalTrack;
  winnerId: PlayerId | null;
  points: number;
  guesses: Record<PlayerId, MusicalGuess[]>;
  responseTimes: Record<PlayerId, number | null>;
}

export interface MusicalState {
  version: number;
  status: MusicalStatus;
  phase: MusicalPhase;
  config: MusicalConfig;
  gameId: 'musical';
  roomCode: RoomCode;
  round: number;
  turnSeat: null;
  players: MusicalPlayer[];
  /** IDs ya usadas en esta partida. No se pueden volver a seleccionar. */
  playedTrackIds: string[];
  currentTrack: MusicalTrack | null;
  /** Marca de tiempo del servidor cuando el anfitrión inicia el clip. */
  clipStartedAt: number | null;
  buzzedPlayerId: PlayerId | null;
  blockedPlayerIds: PlayerId[];
  /** Jugadores que han pedido ver la respuesta en privado en modo online. */
  gaveUpPlayerIds: PlayerId[];
  clipIndex: number;
  guesses: Record<PlayerId, MusicalGuess[]>;
  roundResult: MusicalRoundResultState | null;
  winnerId: PlayerId | null;
  rematchVotes: PlayerId[];
}

export function activePlayers(state: MusicalState): MusicalPlayer[] {
  return state.players.filter((player) => !player.left);
}

export function findPlayer(state: MusicalState, playerId: PlayerId): MusicalPlayer | undefined {
  return state.players.find((player) => player.playerId === playerId);
}

export function musicalConfigForGame(config: GameConfig): MusicalConfig {
  if (config.gameId !== 'musical') {
    throw new Error(`La configuración ${config.gameId} no corresponde a Musical`);
  }
  return config;
}
