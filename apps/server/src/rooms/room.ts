// Sala de juego en memoria. Contrato §6 / P6.
//
// Contiene jugadores, estado del motor (o null en lobby), pantallas centrales
// conectadas, anfitrión y marca de última actividad. Es la unidad que maneja
// RoomManager. No conoce sockets: tiene ids, y el difusor los resuelve.
import type {
  CardId,
  GameConfig,
  GameAction,
  GameEvent,
  GameId,
  PlayerId,
  RoomCode,
  RoomStats,
  RoomStatsRow,
} from '@ronda/protocol';
import type { ChinchonState, MusState, PartyState, PochaState } from '@ronda/engine';

/** Estado del motor de cualquier juego registrado (§10.8: GameModule<S,A>
 * ya era genérico de verdad; esta unión es lo único que faltaba en el lado
 * del servidor para dejar de asumir Chinchón a mano). */
export type EngineState = ChinchonState | PochaState | MusState | PartyState;

/** Estado de los juegos "un jugador, una puntuación" (§12.12): todos menos
 * Mus. Se usa donde el servidor lee `winnerId`, `round` o `player.score`,
 * que en Mus no existen porque el marcador es de la pareja. */
export type ScoredEngineState = ChinchonState | PochaState | PartyState;

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
  /** Jugador robot (modo "contra la máquina"): lo mueve bot-driver.ts, nunca un socket. */
  isBot: boolean;
}

export type RoomStatus = 'lobby' | 'playing' | 'roundEnd' | 'gameEnd' | 'closed';

export interface DiagnosticActionTrailEntry {
  at: number;
  playerId: PlayerId;
  clientActionId: string;
  expectedVersion: number;
  beforeVersion: number | null;
  afterVersion: number | null;
  result: 'ok' | string;
  action: Record<string, string | number | boolean | null>;
}

const MAX_DIAGNOSTIC_ACTIONS = 50;

function summarizeAction(action: GameAction): Record<string, string | number | boolean | null> {
  const raw = action as unknown as Record<string, unknown>;
  const summary: Record<string, string | number | boolean | null> = { type: action.type };
  for (const key of ['cardId', 'amount', 'count', 'value', 'piedras', 'tiene'] as const) {
    const field = raw[key];
    if (typeof field === 'string' || typeof field === 'number' || typeof field === 'boolean') {
      summary[key] = field;
    }
  }
  if (Array.isArray(raw.cardIds)) summary.cardCount = raw.cardIds.length;
  if (Array.isArray(raw.order)) summary.cardCount = raw.order.length;
  if (Array.isArray(raw.colors)) summary.choiceCount = raw.colors.length;
  if (typeof raw.answer === 'string') summary.answerLength = raw.answer.length;
  return summary;
}

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
  /** Estadísticas de la sala actualizadas (una partida acaba de terminar). */
  onStats?: (room: Room) => void;
  /** Un temporizador de turno ha ejecutado una jugada automática. */
  onTurnTimeout?: (room: Room) => void;
  /** Evento de telemetría (P18). */
  onTrack?: (room: Room, kind: string, payload?: Record<string, unknown>) => void;
}

export const HOST_GRACE_MS = 45_000; // §6 traspaso de anfitrión
export const DEFAULT_ROOM_INACTIVITY_MS = 30 * 60 * 1000; // 30 min
export const LOBBY_TTL_MS = 2 * 60 * 60 * 1000;
export const PLAYING_TTL_MS = 6 * 60 * 60 * 1000;

export class Room {
  readonly code: RoomCode;
  readonly gameId: GameId;
  config: GameConfig;
  status: RoomStatus;
  players: Map<PlayerId, PlayerRuntime> = new Map();
  /** Estado del motor; null mientras esté en lobby. */
  state: EngineState | null = null;
  /** socketIds de pantallas centrales conectadas. */
  screens: Set<string> = new Set();
  hostPlayerId: PlayerId | null = null;
  /** ms epoch de la última mutación válida de sala o partida (no presencia). */
  lastActivityAt: number;
  /** Ids de acción ya procesados (idempotencia). Acotado por el servidor. */
  processedActions: Map<string, number> = new Map();
  /** Semilla de la partida actual. */
  seed: string;
  createdAt: number;
  hooks: RoomHooks;
  /**
   * Estadísticas del grupo acumuladas en esta sala (roadmap "Después del
   * MVP" §3), por jugador. Se actualizan al terminar cada partida y
   * sobreviven a las revanchas, que es justo lo que las hace interesantes:
   * "llevamos 4 partidas y Ana ha ganado 3".
   */
  stats: Map<PlayerId, RoomStatsRow> = new Map();
  /** Partidas TERMINADAS en esta sala. */
  matchesPlayed = 0;
  /**
   * Preguntas de Colores ya mostradas durante esta sesión de sala. Se conserva
   * entre revanchas para que una tarde de varias partidas no repita contenido
   * hasta agotar el banco completo.
   */
  seenColorQuestionIds: Set<string> = new Set();
  /**
   * Semilla de la última partida ya contada en `stats`. Cada partida tiene
   * su propia semilla (el rematch genera una nueva), así que basta para no
   * contar dos veces la misma: `applyAction` puede volver a pasar por el
   * estado 'gameEnd' (una acción idempotente reenviada, un abandono que
   * termina una partida ya terminada) y no debe duplicar nada.
   */
  private statsSeed: string | null = null;
  /** ms epoch de la última reacción de cada jugador (enfriamiento, §reacciones). */
  lastReactionAt: Map<PlayerId, number> = new Map();
  /** Últimas acciones aceptadas o rechazadas; nunca guarda texto libre ni tokens. */
  private diagnosticActions: DiagnosticActionTrailEntry[] = [];

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

  recordDiagnosticAction(input: {
    at: number;
    playerId: PlayerId;
    clientActionId: string;
    expectedVersion: number;
    beforeVersion: number | null;
    afterVersion: number | null;
    result: 'ok' | string;
    action: GameAction;
  }): void {
    this.diagnosticActions = [
      ...this.diagnosticActions,
      { ...input, action: summarizeAction(input.action) },
    ].slice(-MAX_DIAGNOSTIC_ACTIONS);
  }

  getDiagnosticActions(): DiagnosticActionTrailEntry[] {
    return this.diagnosticActions.map((entry) => ({ ...entry, action: { ...entry.action } }));
  }

  /** Snapshot censurado (delega al motor). Lanza si state es null. */
  snapshot(): { state: EngineState; seed: string } {
    if (!this.state) throw new Error('snapshot: sala sin estado de motor');
    return { state: this.state, seed: this.seed };
  }

  /**
   * Anota una partida terminada en las estadísticas de la sala. Idempotente
   * por semilla de partida (ver `statsSeed`). Devuelve true si esta llamada
   * es la que la contó (útil para persistir solo entonces).
   *
   * Lee del estado del motor, no de `players`: quien abandonó a mitad sigue
   * en `state.players` con su marcador congelado, y jugó esa partida.
   */
  recordMatchEnd(): boolean {
    const state = this.state;
    if (!state) return false;
    if (state.status !== 'gameEnd') return false;
    if (this.statsSeed === this.seed) return false;
    this.statsSeed = this.seed;
    this.matchesPlayed += 1;

    // Mus rompe el supuesto "un jugador, una puntuación" (§12.12): gana una
    // pareja, el jugador no tiene `score` y la ronda es la mano. Se traduce
    // aquí, donde se conoce el juego, y no en la interfaz.
    if (state.gameId === 'mus') {
      for (const p of state.players) {
        const won = state.winnerTeamIndex !== null && p.teamIndex === state.winnerTeamIndex;
        const juegos = state.juegosWon[p.teamIndex] ?? 0;
        this.addStatsRow(p, { won, rounds: state.handNumber, score: juegos });
      }
      return true;
    }

    for (const p of state.players) {
      this.addStatsRow(p, {
        won: state.winnerId === p.playerId,
        rounds: state.round,
        score: p.score,
      });
    }
    return true;
  }

  /** Acumula una partida en la fila de un jugador. Común a los tres juegos:
   * lo único que cambia entre ellos es de dónde salen `won`/`rounds`/`score`. */
  private addStatsRow(
    player: { playerId: PlayerId; nick: string; seat: number },
    match: { won: boolean; rounds: number; score: number },
  ): void {
    const row = this.stats.get(player.playerId) ?? {
      playerId: player.playerId,
      nick: player.nick,
      seat: player.seat,
      matches: 0,
      wins: 0,
      rounds: 0,
      totalScore: 0,
      bestScore: null,
      worstScore: null,
    };
    row.nick = player.nick; // el apodo de la última partida manda
    row.seat = player.seat;
    row.matches += 1;
    if (match.won) row.wins += 1;
    row.rounds += match.rounds;
    row.totalScore += match.score;
    row.bestScore =
      row.bestScore === null ? match.score : this.pickBest(row.bestScore, match.score);
    row.worstScore =
      row.worstScore === null ? match.score : this.pickWorst(row.worstScore, match.score);
    this.stats.set(player.playerId, row);
  }

  /** Estadísticas de la sala, ya ordenadas para pintar. */
  getStats(): RoomStats {
    const rows = [...this.stats.values()]
      .map((r) => ({ ...r }))
      .sort(
        (a, b) =>
          b.wins - a.wins ||
          b.matches - a.matches ||
          (this.lowerIsBetter() ? a.totalScore - b.totalScore : b.totalScore - a.totalScore) ||
          a.seat - b.seat,
      );
    return { roomCode: this.code, gameId: this.gameId, matches: this.matchesPlayed, rows };
  }

  /**
   * En Chinchón gana quien MENOS puntos suma (§5: se elimina al pasar del
   * umbral); en Pocha, quien MÁS (§9.7), y en Mus también (lo que se acumula
   * son juegos ganados por la pareja). "Mejor puntuación" no significa lo
   * mismo en todos, así que el criterio vive aquí, donde se conoce el
   * `gameId`, y no en la interfaz.
   */
  private lowerIsBetter(): boolean {
    return this.gameId === 'chinchon';
  }

  private pickBest(a: number, b: number): number {
    return this.lowerIsBetter() ? Math.min(a, b) : Math.max(a, b);
  }

  private pickWorst(a: number, b: number): number {
    return this.lowerIsBetter() ? Math.max(a, b) : Math.min(a, b);
  }
}

/** Tipo auxiliar: id de carta (reexportado para comodidad de otros módulos). */
export type { CardId };
