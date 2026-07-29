// Sala de juego en memoria. Contrato §6 / P6.
//
// Contiene jugadores, estado del motor (o null en lobby), pantallas centrales
// conectadas, anfitrión y marca de última actividad. Es la unidad que maneja
// RoomManager. No conoce sockets: tiene ids, y el difusor los resuelve.
import type {
  CardId,
  GameConfig,
  GameEvent,
  GameId,
  PlayerId,
  RoomCode,
} from '@ronda/protocol';
import type { ChinchonState } from '@ronda/engine';

/** Estado runtime de un jugador en la sala. */
export interface PlayerRuntime {
  playerId: PlayerId;
  nick: string;
  seat: number;
  tokenHash: string; // sha256 del token opaco
  isHost: boolean;
  connected: boolean;
  /** ms epoch del último mensaje recibido / última vez visto conectado. */
  lastSeenAt: number;
  /** ms epoch en que se desconectó (para el grace de traspaso de anfitrión). */
  disconnectedAt: number | null;
  socketId: string | null;
}

export type RoomStatus = 'lobby' | 'playing' | 'roundEnd' | 'gameEnd' | 'closed';

/** Callbacks de difusión inyectados (P8 los rellena con sockets reales). */
export interface RoomHooks {
  /** Emite el snapshot censurado a todos los miembros de la sala. */
  onSnapshot?: (room: Room) => void;
  /** Emite eventos cosméticos (animaciones). */
  onEvent?: (room: Room, events: GameEvent[], version: number) => void;
  /** Emite un toast a todos. */
  onToast?: (room: Room, level: 'info' | 'warn', text: string) => void;
  /** La sala se ha cerrado. */
  onClosed?: (room: Room, reason: 'host_left' | 'empty' | 'expired') => void;
  /** Snapshot de persistencia (P7). */
  onPersist?: (room: Room) => void;
  /** Evento de telemetría (P18). */
  onTrack?: (room: Room, kind: string, payload?: Record<string, unknown>) => void;
}

export const HOST_GRACE_MS = 45_000; // §6 traspaso de anfitrión
export const LOBBY_TTL_MS = 2 * 60 * 60 * 1000; // 2 h
export const PLAYING_TTL_MS = 6 * 60 * 60 * 1000; // 6 h sin nadie conectado

export class Room {
  readonly code: RoomCode;
  readonly gameId: GameId;
  config: GameConfig;
  status: RoomStatus;
  players: Map<PlayerId, PlayerRuntime> = new Map();
  /** Estado del motor; null mientras esté en lobby. */
  state: ChinchonState | null = null;
  /** socketIds de pantallas centrales conectadas. */
  screens: Set<string> = new Set();
  hostPlayerId: PlayerId | null = null;
  lastActivityAt: number;
  /** Ids de acción ya procesados (idempotencia). Acotado por el servidor. */
  processedActions: Map<string, number> = new Map();
  /** Semilla de la partida actual. */
  seed: string;
  createdAt: number;
  hooks: RoomHooks;

  constructor(init: {
    code: RoomCode;
    gameId: GameId;
    config: GameConfig;
    seed: string;
    now: number;
    hooks?: RoomHooks;
  }) {
    this.code = init.code;
    this.gameId = init.gameId;
    this.config = init.config;
    this.status = 'lobby';
    this.lastActivityAt = init.now;
    this.seed = init.seed;
    this.createdAt = init.now;
    this.hooks = init.hooks ?? {};
  }

  /** Jugadores ordenados por asiento. */
  playersBySeat(): PlayerRuntime[] {
    return [...this.players.values()].sort((a, b) => a.seat - b.seat);
  }

  /** Asiento libre más bajo (0..maxPlayers-1), o null si no hay. */
  nextFreeSeat(): number | null {
    const taken = new Set([...this.players.values()].map((p) => p.seat));
    for (let s = 0; s < this.config.maxPlayers; s++) {
      if (!taken.has(s)) return s;
    }
    return null;
  }

  /** ¿Está ocupado el apodo (case-insensitive)? */
  isNickTaken(nick: string): boolean {
    const key = nick.toLowerCase();
    for (const p of this.players.values()) {
      if (p.nick.toLowerCase() === key) return true;
    }
    return false;
  }

  /** Marca actividad (cualquier mutación válida). */
  touch(now: number): void {
    this.lastActivityAt = now;
  }

  /** Snapshot censurado (delega al motor). Lanza si state es null. */
  snapshot(): { state: ChinchonState; seed: string } {
    if (!this.state) throw new Error('snapshot: sala sin estado de motor');
    return { state: this.state, seed: this.seed };
  }
}

/** Tipo auxiliar: id de carta (reexportado para comodidad de otros módulos). */
export type { CardId };
