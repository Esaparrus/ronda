// Gestión de salas en memoria. Contrato §6 / P6.
//
// Toda la validación de permisos vive aquí (anfitrión, jugador en sala, sala
// empezada). Toda mutación actualiza lastActivityAt. applyAction delega en
// GAMES[gameId].applyAction y NUNCA implementa reglas por su cuenta.
import {
  REACTION_COOLDOWN_MS,
  type GameAction,
  type GameConfig,
  type GameId,
  type PlayerId,
  type ReactionId,
  type ReactionPayload,
  type Result,
  type RoomStats,
  err,
  ok,
} from '@ronda/protocol';
import { GAMES, isRoadmapGame } from '@ronda/engine';
import type { PriceQuestion } from '@ronda/engine';
import type { RoadmapState } from '@ronda/engine';
import { generateRoomCode } from './codes.ts';
import { createToken, hashToken } from './tokens.ts';
import { isValidNick, normalizeNick } from './nick.ts';
import {
  HOST_GRACE_MS,
  LOBBY_TTL_MS,
  PLAYING_TTL_MS,
  Room,
  type EngineState,
  type PlayerRuntime,
  type RoomHooks,
} from './room.ts';
import { randomUUID } from 'node:crypto';
import { decideChinchonTimeoutDiscard } from './bot-policy.ts';

/** Mínimo de jugadores por juego. Mus necesita exactamente 4 porque se juega
 * por parejas; el resto puede comenzar con 2 personas. No hay una constante de contrato por juego para esto
 * (MIN_PLAYERS/MAX_PLAYERS de @ronda/protocol son el límite ABSOLUTO de sala,
 * §10.6, no el de un juego concreto). */
export function minPlayersFor(gameId: GameId): number {
  if (gameId === 'mus') return 4;
  if (gameId === 'laronda' || gameId === 'granronda') return 3;
  return 2;
}

export interface JoinResult {
  roomCode: string;
  playerId: PlayerId;
  playerToken: string;
  seat: number;
}

export interface RoomManagerOptions {
  /** Tiempo sin mutaciones válidas ni jugadores conectados antes de cerrar una sala. */
  inactivityTimeoutMs?: number;
  /** Tiempo sin heartbeat de una pestaña antes de marcarla desconectada. */
  presenceTimeoutMs?: number;
  /** Catálogo remoto ya consultado; se congela dentro de cada partida. */
  precioJustoQuestions?: readonly PriceQuestion[];
  /** Proveedor para refrescar el catálogo entre partidas sin tocar el motor. */
  precioJustoQuestionsProvider?: () => readonly PriceQuestion[] | null;
}

/**
 * Coloca primero las preguntas que todavía no se han visto en esta sala. Si
 * ya no quedan suficientes para completar la partida, comienza un ciclo nuevo
 * con el banco entero; dentro de cada ciclo nunca hay repeticiones.
 */
function prioritizeUnseenColorQuestions(room: Room, state: EngineState): EngineState {
  if (state.gameId !== 'colores' || state.config.gameId !== 'colores' || !state.colors)
    return state;

  const order = state.colors.questionOrder;
  const unseen = order.filter((id) => !room.seenColorQuestionIds.has(id));
  if (unseen.length < Math.min(state.config.rounds, order.length)) {
    room.seenColorQuestionIds.clear();
    return state;
  }

  const seen = order.filter((id) => room.seenColorQuestionIds.has(id));
  state.colors.questionOrder = [...unseen, ...seen];
  state.colors.questionId = state.colors.questionOrder[0] ?? '';
  return state;
}

function rememberCurrentColorQuestion(room: Room, state: EngineState): void {
  if (state.gameId === 'colores' && state.colors?.questionId) {
    room.seenColorQuestionIds.add(state.colors.questionId);
  }
}

/**
 * RoomManager: el único punto de mutación de salas. Mantiene un Map de salas
 * activas indexado por código. Los sockets (P8) y la persistencia (P7) se enganchan
 * vía callbacks inyectados por sala.
 */
export class RoomManager {
  private rooms = new Map<string, Room>();
  /** Inyecta hooks a cada sala nueva. P8 los rellena. */
  private hooksFactory: () => RoomHooks;
  /** io inyectado (P8) para que los hooks puedan difundir. Opcional. */
  private io: unknown = null;
  /** Un único temporizador de turno por sala; no existe para partidas sin tiempo. */
  private turnTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Plazo de Colores, creado solo después de la primera respuesta. */
  private colorTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Plazo de estimaciones de Escala, creado cuando la guía confirma la pista. */
  private scaleTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Plazo de respuesta de Precio justo, creado al iniciar cada ronda. */
  private priceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  /** Plazos de las cuatro rondas de preguntas independientes. */
  private roadmapTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private inactivityTimeoutMs: number | undefined;
  private presenceTimeoutMs: number | undefined;
  private precioJustoQuestions: readonly PriceQuestion[] | undefined;
  private precioJustoQuestionsProvider: (() => readonly PriceQuestion[] | null) | undefined;

  constructor(hooksFactory: () => RoomHooks = () => ({}), options: RoomManagerOptions = {}) {
    this.hooksFactory = hooksFactory;
    this.inactivityTimeoutMs = options.inactivityTimeoutMs;
    this.presenceTimeoutMs = options.presenceTimeoutMs;
    this.precioJustoQuestions = options.precioJustoQuestions;
    this.precioJustoQuestionsProvider = options.precioJustoQuestionsProvider;
  }

  /** Inyecta el servidor io (para que hooks difundan toasts/closed). P8. */
  setIo(io: unknown): void {
    this.io = io;
  }

  /** Devuelve el io inyectado (para hooks que necesiten difundir). */
  getIo(): unknown {
    return this.io;
  }

  /** Número de salas activas (para /health). */
  countRooms(): number {
    return this.rooms.size;
  }

  getRoomByCode(code: string): Room | undefined {
    return this.rooms.get(code);
  }

  // --- create --------------------------------------------------------------

  createRoom(input: {
    gameId: GameId;
    config: GameConfig;
    nick: string;
    now: number;
  }): Result<JoinResult> {
    // El intervalo periódico mantiene limpia una sala sin tráfico, pero esta
    // comprobación también evita conservar cadáveres si el proceso estuvo
    // suspendido o el barrido se retrasó.
    this.sweep(input.now);
    if (!GAMES[input.gameId]) return err('GAME_NOT_FOUND');
    if (!isValidNick(input.nick)) return err('NICK_INVALID');

    const code = generateRoomCode((c) => this.rooms.has(c));
    if (!code) return err('INTERNAL');

    const playerId = randomUUID() as PlayerId;
    const token = createToken();
    const seat = 0;

    const room = new Room({
      code,
      gameId: input.gameId,
      config: input.config,
      seed: randomSeed(),
      now: input.now,
      hooks: this.hooksFactory(),
    });

    const player: PlayerRuntime = {
      playerId,
      nick: normalizeNick(input.nick),
      seat,
      tokenHash: hashToken(token),
      isHost: true,
      connected: true,
      lastSeenAt: input.now,
      disconnectedAt: null,
      socketId: null,
      isBot: false,
      groupIndex: initialScaleGroupIndex(
        input.config,
        input.gameId,
        room.seed,
        playerId,
        seat,
        room.players.values(),
      ),
    };
    room.players.set(playerId, player);
    room.hostPlayerId = playerId;
    room.touch(input.now);
    room.hooks.onTrack?.(room, 'room_created', { gameId: input.gameId });

    this.rooms.set(code, room);
    return ok({ roomCode: code, playerId, playerToken: token, seat });
  }

  // --- join ----------------------------------------------------------------

  joinRoom(input: { roomCode: string; nick: string; now: number }): Result<JoinResult> {
    this.sweep(input.now);
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status === 'closed') return err('ROOM_CLOSED');
    if (room.status !== 'lobby') return err('ROOM_ALREADY_STARTED');
    if (!isValidNick(input.nick)) return err('NICK_INVALID');
    if (room.isNickTaken(input.nick)) return err('NICK_TAKEN');

    const seat = room.nextFreeSeat();
    if (seat === null) return err('ROOM_FULL');

    const playerId = randomUUID() as PlayerId;
    const token = createToken();
    const player: PlayerRuntime = {
      playerId,
      nick: normalizeNick(input.nick),
      seat,
      tokenHash: hashToken(token),
      isHost: false,
      connected: true,
      lastSeenAt: input.now,
      disconnectedAt: null,
      socketId: null,
      isBot: false,
      groupIndex: initialScaleGroupIndex(
        room.config,
        room.gameId,
        room.seed,
        playerId,
        seat,
        room.players.values(),
      ),
    };
    room.players.set(playerId, player);
    room.touch(input.now);
    room.hooks.onSnapshot?.(room);
    room.hooks.onTrack?.(room, 'player_joined', { nick: player.nick });
    return ok({ roomCode: room.code, playerId, playerToken: token, seat });
  }

  // --- addBot ----------------------------------------------------------------

  /**
   * Añade un jugador robot a la sala (modo "contra la máquina"): mismo
   * camino que joinRoom, pero solo el anfitrión puede llamarlo, solo en
   * lobby, y el jugador queda marcado `isBot`. bot-driver.ts es quien lo
   * mueve después; nunca tiene socket propio.
   */
  addBot(input: {
    roomCode: string;
    playerId: PlayerId;
    now: number;
    delayMs?: number;
  }): Result<JoinResult> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status !== 'lobby') return err('ROOM_ALREADY_STARTED');
    const host = room.players.get(input.playerId);
    if (!host) return err('PLAYER_NOT_IN_ROOM');
    if (!host.isHost) return err('NOT_HOST');
    const seat = room.nextFreeSeat();
    if (seat === null) return err('ROOM_FULL');

    const nick = nextBotNick(room);
    const playerId = randomUUID() as PlayerId;
    const token = createToken();
    const player: PlayerRuntime = {
      playerId,
      nick,
      seat,
      tokenHash: hashToken(token),
      isHost: false,
      connected: true,
      lastSeenAt: input.now,
      disconnectedAt: null,
      socketId: null,
      isBot: true,
      groupIndex: initialScaleGroupIndex(
        room.config,
        room.gameId,
        room.seed,
        playerId,
        seat,
        room.players.values(),
      ),
      botDelayMs:
        room.gameId === 'musical' ? 5_000 : Math.min(15_000, Math.max(500, input.delayMs ?? 2_500)),
    };
    room.players.set(playerId, player);
    room.touch(input.now);
    room.hooks.onSnapshot?.(room);
    room.hooks.onTrack?.(room, 'player_joined', { nick, isBot: true });
    return ok({ roomCode: room.code, playerId, playerToken: token, seat });
  }

  // --- swapSeats -------------------------------------------------------------

  /**
   * Intercambia el asiento de dos jugadores. Solo el anfitrión y solo en
   * lobby. Existe por Mus: las parejas se derivan de `seat % 2` (§12.2) y la
   * decisión 1 de P28 dice que las asigna el anfitrión moviendo asientos.
   * Vale para los tres juegos -- el asiento también fija el orden de turno.
   */
  swapSeats(input: {
    roomCode: string;
    playerId: PlayerId; // anfitrión
    aPlayerId: PlayerId;
    bPlayerId: PlayerId;
    now: number;
  }): Result<null> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status !== 'lobby') return err('ROOM_ALREADY_STARTED');
    const host = room.players.get(input.playerId);
    if (!host) return err('PLAYER_NOT_IN_ROOM');
    if (!host.isHost) return err('NOT_HOST');
    if (input.aPlayerId === input.bPlayerId) return err('INVALID_ACTION');

    const a = room.players.get(input.aPlayerId);
    const b = room.players.get(input.bPlayerId);
    if (!a || !b) return err('PLAYER_NOT_IN_ROOM');

    const seat = a.seat;
    a.seat = b.seat;
    b.seat = seat;
    room.touch(input.now);
    room.hooks.onSnapshot?.(room);
    return ok(null);
  }

  // --- groups --------------------------------------------------------------

  /** Asigna un jugador a un grupo de Escala desde el lobby. */
  setPlayerGroup(input: {
    roomCode: string;
    playerId: PlayerId; // anfitrión
    targetPlayerId: PlayerId;
    groupIndex: number;
    now: number;
  }): Result<null> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status !== 'lobby' || room.gameId !== 'escala') return err('ROOM_ALREADY_STARTED');
    const host = room.players.get(input.playerId);
    if (!host) return err('PLAYER_NOT_IN_ROOM');
    if (!host.isHost) return err('NOT_HOST');
    const target = room.players.get(input.targetPlayerId);
    if (!target) return err('PLAYER_NOT_IN_ROOM');
    const config = room.config;
    if (config.gameId !== 'escala' || config.groupMode !== 'groups') {
      return err('INVALID_ACTION');
    }
    if (
      !Number.isInteger(input.groupIndex) ||
      input.groupIndex < 0 ||
      input.groupIndex >= config.groupCount
    ) {
      return err('INVALID_ACTION');
    }
    target.groupIndex = input.groupIndex;
    room.touch(input.now);
    room.hooks.onSnapshot?.(room);
    return ok(null);
  }

  // --- resume --------------------------------------------------------------

  resumeByToken(input: {
    roomCode: string;
    playerToken: string;
    now: number;
  }): Result<{ roomCode: string; playerId: PlayerId; seat: number }> {
    this.sweep(input.now);
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status === 'closed') return err('ROOM_CLOSED');

    const hash = hashToken(input.playerToken);
    for (const p of room.players.values()) {
      if (p.tokenHash === hash) {
        p.connected = true;
        p.lastSeenAt = input.now;
        p.disconnectedAt = null;
        room.touch(input.now);
        return ok({ roomCode: room.code, playerId: p.playerId, seat: p.seat });
      }
    }
    return err('INVALID_TOKEN');
  }

  /**
   * Resume por token sin roomCode: busca en todas las salas activas.
   * Contrato §2.3: 'room:resume' { playerToken }.
   * Devuelve la sala/jugador si el token corresponde a una sala activa.
   */
  resumeByTokenGlobal(input: { playerToken: string; now: number }): Result<{
    roomCode: string;
    playerId: PlayerId;
    seat: number;
  }> {
    this.sweep(input.now);
    const hash = hashToken(input.playerToken);
    for (const room of this.rooms.values()) {
      if (room.status === 'closed') continue;
      for (const p of room.players.values()) {
        if (p.tokenHash === hash) {
          p.connected = true;
          p.lastSeenAt = input.now;
          p.disconnectedAt = null;
          room.touch(input.now);
          return ok({ roomCode: room.code, playerId: p.playerId, seat: p.seat });
        }
      }
    }
    return err('INVALID_TOKEN');
  }

  // --- config --------------------------------------------------------------

  setConfig(input: {
    roomCode: string;
    playerId: PlayerId;
    patch: Partial<GameConfig>;
    now: number;
  }): Result<{ config: GameConfig }> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status !== 'lobby') return err('ROOM_ALREADY_STARTED');
    const player = room.players.get(input.playerId);
    if (!player) return err('PLAYER_NOT_IN_ROOM');
    if (!player.isHost) return err('NOT_HOST');

    // Merge conservando gameId (no se cambia el juego de una sala). El cast
    // es necesario porque GameConfig es una unión discriminada (§10.2, P22):
    // `gameId: room.gameId` (tipado como el GameId ancho) hace que TS ya no
    // pueda inferir a qué miembro concreto de la unión pertenece el objeto
    // resultante, aunque en runtime siga siendo exactamente la misma config
    // del mismo juego de siempre (el merge nunca cambia `gameId`).
    const previousScaleConfig = room.config.gameId === 'escala' ? room.config : null;
    room.config = { ...room.config, ...input.patch, gameId: room.gameId } as GameConfig;
    if (room.gameId === 'escala' && room.config.gameId === 'escala') {
      const scaleConfig = room.config;
      const shouldRandomizeGroups =
        scaleConfig.groupMode === 'groups' &&
        (previousScaleConfig?.groupMode !== 'groups' ||
          previousScaleConfig.groupCount !== scaleConfig.groupCount);

      if (shouldRandomizeGroups) {
        randomizeScaleGroups(room);
      } else if (scaleConfig.groupMode === 'groups') {
        for (const runtime of room.players.values()) {
          const groupIndex = runtime.groupIndex;
          runtime.groupIndex =
            typeof groupIndex === 'number' &&
            Number.isInteger(groupIndex) &&
            groupIndex >= 0 &&
            groupIndex < scaleConfig.groupCount
              ? groupIndex
              : initialScaleGroupIndex(
                  scaleConfig,
                  room.gameId,
                  room.seed,
                  runtime.playerId,
                  runtime.seat,
                  room.players.values(),
                );
        }
      } else {
        for (const runtime of room.players.values()) runtime.groupIndex = null;
      }
    }
    room.touch(input.now);
    room.hooks.onSnapshot?.(room);
    return ok({ config: room.config });
  }

  // --- start ---------------------------------------------------------------

  start(input: { roomCode: string; playerId: PlayerId; now: number }): Result<null> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status !== 'lobby') return err('ROOM_ALREADY_STARTED');
    const player = room.players.get(input.playerId);
    if (!player) return err('PLAYER_NOT_IN_ROOM');
    if (!player.isHost) return err('NOT_HOST');

    const actives = room.playersBySeat();
    if (actives.length < minPlayersFor(room.gameId)) return err('NOT_ENOUGH_PLAYERS');
    if (
      room.gameId === 'escala' &&
      room.config.gameId === 'escala' &&
      room.config.groupMode === 'groups'
    ) {
      const sizes = new Map<number, number>();
      for (const player of actives) {
        if (player.groupIndex === null || player.groupIndex === undefined)
          return err('INVALID_GROUPS');
        sizes.set(player.groupIndex, (sizes.get(player.groupIndex) ?? 0) + 1);
      }
      if (
        Array.from({ length: room.config.groupCount }, (_, index) => sizes.get(index) ?? 0).some(
          (size) => size < 2,
        )
      ) {
        return err('INVALID_GROUPS');
      }
    }

    const module = GAMES[room.gameId];
    if (!module) return err('GAME_NOT_FOUND');

    const initialState = prioritizeUnseenColorQuestions(
      room,
      module.createInitialState(dealInput(room, this.priceQuestionsForStart())) as EngineState,
    );
    room.state = this.withTurnDeadline(null, initialState, input.now);
    rememberCurrentColorQuestion(room, room.state);
    room.status = 'playing';
    room.touch(input.now);
    this.syncTurnTimer(room, null);
    this.syncColorTimer(room);
    this.syncScaleTimer(room);
    this.syncPriceTimer(room);
    this.syncRoadmapTimer(room);
    room.hooks.onSnapshot?.(room);
    room.hooks.onTrack?.(room, 'game_started', { players: actives.length });
    return ok(null);
  }

  // --- kick ----------------------------------------------------------------

  kick(input: {
    roomCode: string;
    playerId: PlayerId; // anfitrión
    targetId: PlayerId;
    now: number;
  }): Result<null> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    const host = room.players.get(input.playerId);
    if (!host) return err('PLAYER_NOT_IN_ROOM');
    if (!host.isHost) return err('NOT_HOST');
    const target = room.players.get(input.targetId);
    if (!target) return err('PLAYER_NOT_IN_ROOM');

    return this.removePlayer(room, target, input.now, 'kick');
  }

  // --- leave ---------------------------------------------------------------

  leave(input: { roomCode: string; playerId: PlayerId; now: number }): Result<null> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    const player = room.players.get(input.playerId);
    if (!player) return err('PLAYER_NOT_IN_ROOM');
    return this.removePlayer(room, player, input.now, 'leave');
  }

  /** Sale/expulsa a un jugador. Si la partida está en juego, congela marcador y
   * mete sus cartas al descarte. Si quedan <2 activos, termina la partida. */
  private removePlayer(
    room: Room,
    player: PlayerRuntime,
    now: number,
    reason: 'leave' | 'kick',
  ): Result<null> {
    const wasHost = player.isHost;
    room.players.delete(player.playerId);

    if (room.status === 'playing' || room.status === 'roundEnd') {
      const state = room.state;
      if (
        state &&
        (state.gameId === 'orden' ||
          state.gameId === 'colores' ||
          state.gameId === 'mayoria' ||
          state.gameId === 'escala' ||
          state.gameId === 'matiz' ||
          state.gameId === 'granronda' ||
          state.gameId === 'musical' ||
          state.gameId === 'preciojusto' ||
          isRoadmapGame(state.gameId))
      ) {
        // Los modos sociales esperan a todos los jugadores activos para
        // revelar. Marcar la salida en el estado evita dejar una ronda
        // bloqueada esperando una respuesta que ya no llegará.
        if (state.gameId === 'musical') {
          room.state = {
            ...state,
            players: state.players.map((candidate) =>
              candidate.playerId === player.playerId ? { ...candidate, left: true } : candidate,
            ),
            ...(state.buzzedPlayerId === player.playerId ? { buzzedPlayerId: null } : {}),
          };
        } else if (state.gameId === 'preciojusto') {
          room.state = {
            ...state,
            players: state.players.map((candidate) =>
              candidate.playerId === player.playerId ? { ...candidate, left: true } : candidate,
            ),
          };
        } else {
          room.state = {
            ...state,
            players: state.players.map((candidate) =>
              candidate.playerId === player.playerId ? { ...candidate, left: true } : candidate,
            ),
          } as EngineState;
        }
      }
      if (state?.gameId === 'laronda') {
        const leavingSeat = state.players.find(
          (candidate) => candidate.playerId === player.playerId,
        )?.seat;
        const players = state.players.map((candidate) =>
          candidate.playerId === player.playerId ? { ...candidate, left: true } : candidate,
        );
        const nextActiveSeat = (fromSeat: number): number | null => {
          for (let offset = 1; offset <= players.length; offset += 1) {
            const candidate =
              (fromSeat + state.direction * offset + players.length * 2) % players.length;
            if (players[candidate] && !players[candidate].left) {
              return candidate;
            }
          }
          return null;
        };
        let turnSeat = state.turnSeat;
        let phase = state.phase;
        let status = state.status;
        let bill = state.bill
          ? {
              ...state.bill,
              responderSeats: [...state.bill.responderSeats],
              passedSeats: [...state.bill.passedSeats],
              tipCardIds: [...state.bill.tipCardIds],
            }
          : null;

        if (leavingSeat !== undefined && bill?.requesterSeat === leavingSeat) {
          if (phase === 'discard') {
            status = 'roundEnd';
            room.status = 'roundEnd';
            turnSeat = null;
          } else {
            phase = 'ordering';
            bill = null;
            turnSeat = nextActiveSeat(leavingSeat);
          }
        } else if (leavingSeat !== undefined && phase === 'tips' && bill) {
          const removedIndex = bill.responderSeats.indexOf(leavingSeat);
          if (removedIndex >= 0) {
            bill.responderSeats.splice(removedIndex, 1);
            bill.passedSeats = bill.passedSeats.filter((seat) => seat !== leavingSeat);
            if (removedIndex < bill.responderIndex) bill.responderIndex -= 1;
            if (bill.responderSeats.length > 0) {
              bill.responderIndex %= bill.responderSeats.length;
              turnSeat = bill.responderSeats[bill.responderIndex] ?? null;
            } else {
              phase = 'ordering';
              bill = null;
              turnSeat = nextActiveSeat(leavingSeat);
            }
          }
        } else if (leavingSeat !== undefined && turnSeat === leavingSeat) {
          turnSeat = nextActiveSeat(leavingSeat);
        }
        room.state = {
          ...state,
          version: state.version + 1,
          players,
          turnSeat,
          phase,
          status,
          bill,
        };
      }
      // El motor no gestiona abandonos directamente: marcamos el jugador como
      // eliminado congelando su marcador. Simplificación aceptable para el MVP.
      // (Una implementación más fina movería sus cartas al descarte; aquí
      // anotamos el abandono y dejamos que el motor puntúe al final de ronda.)
    }

    // Traspaso de anfitrión si se va el host.
    if (wasHost) {
      const next = [...room.players.values()]
        .filter((p) => p.connected)
        .sort((a, b) => a.seat - b.seat)[0];
      if (next) {
        next.isHost = true;
        room.hostPlayerId = next.playerId;
        room.hooks.onToast?.(room, 'info', `${next.nick} es ahora el anfitrión.`);
      }
    }

    room.touch(now);

    // Si no queda nadie, cerrar.
    if (room.players.size === 0) {
      this.closeRoom(room, 'empty');
      return ok(null);
    }

    // Si en partida quedan menos del mínimo del juego, termina la partida y
    // gana quien quede con más puntos.
    // Simplificación del mismo nivel que ya tenía Chinchón (comentario de
    // arriba): no implementa la propuesta completa de §9.9 para Pocha
    // (anular la ronda en curso sin puntuar) -- esa nota del contrato está
    // marcada ella misma como pendiente de confirmar, y el motor no tiene
    // hoy ninguna `GameAction` de "jugador se fue" en ningún juego. Como los
    // bots nunca se desconectan, esto no afecta al modo "contra la máquina".
    if (room.status === 'playing') {
      const connected = [...room.players.values()].filter((p) => p.connected);
      if (connected.length < minPlayersFor(room.gameId)) {
        room.status = 'gameEnd';
        this.clearTurnTimer(room.code);
        this.clearColorTimer(room.code);
        this.clearScaleTimer(room.code);
        this.clearPriceTimer(room.code);
        const state = room.state;
        if (state?.gameId === 'mus') {
          // Mus, decisión 6 de P28 (§12.11): la partida se ANULA. No hay
          // pareja ganadora que declarar -- con tres no hay Mus, y darle la
          // victoria a la pareja que quede entera sería inventarse un
          // resultado -- y por eso tampoco se llama a `recordMatchEnd()`:
          // esta partida no cuenta en las estadísticas de §11.2.
          room.state = { ...state, status: 'gameEnd', winnerTeamIndex: null };
        } else if (state?.gameId === 'laronda' && connected[0]) {
          const winner = connected.reduce((best, candidate) => {
            const bestScore =
              state.players.find((player) => player.playerId === best.playerId)?.score ?? 0;
            const candidateScore =
              state.players.find((player) => player.playerId === candidate.playerId)?.score ?? 0;
            return candidateScore > bestScore ? candidate : best;
          });
          room.state = {
            ...state,
            status: 'gameEnd',
            winnerId: winner.playerId,
            winnerIds: [winner.playerId],
          };
          if (room.recordMatchEnd()) room.hooks.onStats?.(room);
        } else if (state && connected[0]) {
          room.state = { ...state, status: 'gameEnd', winnerId: connected[0].playerId };
          // Una partida que acaba por abandono cuenta igual en las
          // estadísticas de la sala: se jugó y tiene ganador.
          if (room.recordMatchEnd()) room.hooks.onStats?.(room);
        }
      }
    }

    room.hooks.onSnapshot?.(room);
    void reason;
    return ok(null);
  }

  // --- close (anfitrión) ----------------------------------------------------

  /** Solo el anfitrión: cierra la sala para todos, en cualquier estado (lobby o en juego). */
  closeByHost(input: { roomCode: string; playerId: PlayerId; now: number }): Result<null> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    const player = room.players.get(input.playerId);
    if (!player) return err('PLAYER_NOT_IN_ROOM');
    if (!player.isHost) return err('NOT_HOST');
    this.closeRoom(room, 'host_left');
    return ok(null);
  }

  // --- action --------------------------------------------------------------

  applyAction(input: {
    roomCode: string;
    playerId: PlayerId;
    clientActionId: string;
    expectedVersion: number;
    action: GameAction;
    now: number;
  }): Result<{ version: number }> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (!room.state) return err('INVALID_ACTION');
    const player = room.players.get(input.playerId);
    if (!player) return err('PLAYER_NOT_IN_ROOM');

    // Idempotencia: si ya procesamos este clientActionId, devolver versión guardada.
    const prevVersion = room.processedActions.get(input.clientActionId);
    if (prevVersion !== undefined) {
      return ok({ version: prevVersion });
    }

    // STALE_VERSION: expectedVersion debe coincidir con la versión actual.
    if (input.expectedVersion !== room.state.version) {
      return err('STALE_VERSION');
    }

    const partyNextRound =
      input.action.type === 'nextRound' &&
      (room.gameId === 'orden' ||
        room.gameId === 'colores' ||
        room.gameId === 'mayoria' ||
        room.gameId === 'matiz');
    const granRondaHostAction =
      room.gameId === 'granronda' &&
      (input.action.type === 'finishGranRondaMiniGame' || input.action.type === 'nextRound');
    if (
      (input.action.type === 'setOrderCards' ||
        input.action.type === 'endOrder' ||
        input.action.type === 'resolveMajority' ||
        partyNextRound ||
        input.action.type === 'musicSelectTrack' ||
        input.action.type === 'musicNextClip' ||
        input.action.type === 'musicNextRound' ||
        (input.action.type === 'nextRound' && room.gameId === 'preciojusto') ||
        (input.action.type === 'showPriceResults' && room.gameId === 'preciojusto') ||
        (input.action.type === 'nextRound' && isRoadmapGame(room.gameId)) ||
        granRondaHostAction) &&
      !player.isHost
    ) {
      return err('NOT_HOST');
    }

    const module = GAMES[room.gameId];
    if (!module) return err('GAME_NOT_FOUND');

    const currentState = room.state;
    const r = module.applyAction(currentState, input.playerId, input.action, input.now);
    if (!r.ok) return r;
    // El módulo devuelve estado tipado como `unknown` (AnyGameModule). Aquí
    // recuperamos el tipo concreto (Chinchón o Pocha).
    const rawState = r.value.state as EngineState;
    const newState = this.withTurnDeadline(currentState, rawState, input.now);
    room.state = newState;
    rememberCurrentColorQuestion(room, newState);
    room.processedActions.set(input.clientActionId, newState.version);
    room.touch(input.now);
    this.syncTurnTimer(room, currentState);
    this.syncColorTimer(room);
    this.syncScaleTimer(room);
    this.syncPriceTimer(room);
    this.syncRoadmapTimer(room);

    // `nextRound` puede devolver el motor a playing. La sala mantiene un
    // status propio para lobby/persistencia y debe volver a sincronizarlo;
    // si se quedase en roundEnd, el BotDriver no iniciaría la mano siguiente.
    if (newState.status === 'playing' && room.status === 'roundEnd') {
      room.status = 'playing';
    }

    // Eventos cosméticos (una sola vez por acción).
    if (r.value.events.length > 0) {
      room.hooks.onEvent?.(room, r.value.events, newState.version);
    }
    room.hooks.onSnapshot?.(room);

    // Detectar fin de ronda/partida para persistencia inmediata y telemetría.
    if (newState.status === 'roundEnd' || newState.status === 'gameEnd') {
      if (newState.status === 'gameEnd') {
        room.status = 'gameEnd';
        // Antes de onPersist: así el snapshot de esta partida ya sale con
        // las estadísticas actualizadas.
        if (room.recordMatchEnd()) room.hooks.onStats?.(room);
        room.hooks.onPersist?.(room);
        // En Mus gana una pareja y `winnerId` no existe (§12.12): la
        // telemetría publica el equipo, no un jugador inventado.
        room.hooks.onTrack?.(
          room,
          'game_ended',
          newState.gameId === 'mus'
            ? { winnerTeamIndex: newState.winnerTeamIndex }
            : { winnerId: newState.winnerId },
        );
      } else {
        room.hooks.onPersist?.(room);
        room.status = 'roundEnd';
        room.hooks.onTrack?.(room, 'round_ended', {});
      }
    }
    return ok({ version: newState.version });
  }

  // --- rematch -------------------------------------------------------------

  voteRematch(input: {
    roomCode: string;
    playerId: PlayerId;
    value: boolean;
    now: number;
  }): Result<null> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status !== 'gameEnd') return err('INVALID_ACTION');
    const player = room.players.get(input.playerId);
    if (!player) return err('PLAYER_NOT_IN_ROOM');
    if (!room.state) return err('INVALID_ACTION');

    const votes = room.state.rematchVotes;
    if (input.value) {
      if (!votes.includes(input.playerId)) votes.push(input.playerId);
    } else {
      const i = votes.indexOf(input.playerId);
      if (i >= 0) votes.splice(i, 1);
    }
    room.touch(input.now);

    // ¿Todos los conectados votaron sí?
    const connected = [...room.players.values()].filter((p) => p.connected);
    const allYes = connected.length > 0 && connected.every((p) => votes.includes(p.playerId));
    if (allYes) {
      // Reinicia la partida con los mismos asientos y marcador a cero.
      const module = GAMES[room.gameId];
      if (!module) return err('GAME_NOT_FOUND');
      room.seed = randomSeed();
      const previousState = room.state;
      const initialState = prioritizeUnseenColorQuestions(
        room,
        module.createInitialState(dealInput(room, this.priceQuestionsForStart())) as EngineState,
      );
      room.state = this.withTurnDeadline(previousState, initialState, input.now);
      rememberCurrentColorQuestion(room, room.state);
      room.status = 'playing';
      this.syncTurnTimer(room, previousState);
      this.syncColorTimer(room);
      this.syncScaleTimer(room);
      this.syncPriceTimer(room);
      this.syncRoadmapTimer(room);
      room.hooks.onTrack?.(room, 'rematch', {});
    }
    room.hooks.onSnapshot?.(room);
    return ok(null);
  }

  // --- reacciones -----------------------------------------------------------

  /**
   * Reacción rápida de un jugador (roadmap "Después del MVP" §2). No toca el
   * motor ni la versión de la partida: solo valida quién reacciona y su
   * enfriamiento, y devuelve el payload ya listo para difundir.
   *
   * Vale en cualquier estado de la sala (lobby incluido) y para cualquier
   * jugador, eliminado o no: es una reacción social, no una jugada.
   */
  sendReaction(input: {
    roomCode: string;
    playerId: PlayerId;
    reaction: ReactionId;
    now: number;
  }): Result<ReactionPayload> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status === 'closed') return err('ROOM_CLOSED');
    const player = room.players.get(input.playerId);
    if (!player) return err('PLAYER_NOT_IN_ROOM');

    const last = room.lastReactionAt.get(input.playerId);
    if (last !== undefined && input.now - last < REACTION_COOLDOWN_MS) {
      return err('RATE_LIMITED');
    }
    room.lastReactionAt.set(input.playerId, input.now);
    // A propósito NO llama a room.touch(): una sala en la que solo se manda
    // emojis no debe librarse de la caducidad por inactividad (§6).
    return ok({
      playerId: input.playerId,
      seat: player.seat,
      reaction: input.reaction,
      at: input.now,
    });
  }

  // --- estadísticas ---------------------------------------------------------

  /** Estadísticas acumuladas de la sala. Solo datos públicos (§stats.ts). */
  getStats(input: { roomCode: string }): Result<RoomStats> {
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    return ok(room.getStats());
  }

  // --- screen --------------------------------------------------------------

  attachScreen(input: {
    roomCode: string;
    socketId: string;
    now: number;
  }): Result<{ roomCode: string }> {
    this.sweep(input.now);
    const room = this.rooms.get(input.roomCode);
    if (!room) return err('ROOM_NOT_FOUND');
    if (room.status === 'closed') return err('ROOM_CLOSED');
    room.screens.add(input.socketId);
    room.touch(input.now);
    room.hooks.onSnapshot?.(room);
    return ok({ roomCode: room.code });
  }

  detachScreen(socketId: string): void {
    for (const room of this.rooms.values()) {
      if (room.screens.delete(socketId)) {
        room.hooks.onSnapshot?.(room);
      }
    }
  }

  // --- presence ------------------------------------------------------------

  /** Registra un heartbeat de una pestaña que sigue mostrando la sala. */
  touchPresence(input: {
    roomCode: string;
    playerId: PlayerId;
    socketId: string;
    now: number;
  }): { accepted: boolean; changed: boolean } {
    const room = this.rooms.get(input.roomCode);
    const player = room?.players.get(input.playerId);
    if (!room || !player || player.isBot) return { accepted: false, changed: false };
    // Si otro móvil ha retomado el mismo token, la pestaña antigua no puede
    // volver a marcar al jugador como conectado desde su heartbeat atrasado.
    if (player.socketId !== null && player.socketId !== input.socketId) {
      return { accepted: false, changed: false };
    }
    const changed = !player.connected || player.socketId !== input.socketId;
    player.connected = true;
    player.socketId = input.socketId;
    player.lastSeenAt = input.now;
    player.disconnectedAt = null;
    return { accepted: true, changed };
  }

  /** Marca un jugador como conectado/desconectado y enlaza su socketId. */
  setConnected(input: {
    roomCode: string;
    playerId: PlayerId;
    connected: boolean;
    socketId: string | null;
    now: number;
  }): void {
    const room = this.rooms.get(input.roomCode);
    if (!room) return;
    const p = room.players.get(input.playerId);
    if (!p) return;
    p.connected = input.connected;
    p.socketId = input.socketId;
    p.lastSeenAt = input.now;
    p.disconnectedAt = input.connected ? null : input.now;
    if (
      !input.connected &&
      room.state?.gameId === 'musical' &&
      room.state.buzzedPlayerId === input.playerId
    ) {
      room.state = {
        ...room.state,
        version: room.state.version + 1,
        buzzedPlayerId: null,
      };
    }
    // La presencia no cuenta como actividad de juego: dejar una pestaña
    // conectada no debe mantener viva una sala abandonada indefinidamente.
  }

  /** Traspaso de anfitrión si lleva HOST_GRACE_MS desconectado. */
  maybeTransferHost(now: number): void {
    for (const room of this.rooms.values()) {
      const host = room.hostPlayerId ? room.players.get(room.hostPlayerId) : undefined;
      if (host && !host.connected && host.disconnectedAt !== null) {
        if (now - host.disconnectedAt >= HOST_GRACE_MS) {
          const next = [...room.players.values()]
            .filter((p) => p.connected)
            .sort((a, b) => a.seat - b.seat)[0];
          if (next && next.playerId !== host.playerId) {
            host.isHost = false;
            next.isHost = true;
            room.hostPlayerId = next.playerId;
            room.hooks.onToast?.(room, 'info', `${next.nick} es ahora el anfitrión.`);
            room.hooks.onSnapshot?.(room);
          }
        }
      }
    }
  }

  private priceQuestionsForStart(): readonly PriceQuestion[] | undefined {
    const supplied = this.precioJustoQuestionsProvider?.() ?? this.precioJustoQuestions;
    return supplied && supplied.length > 0 ? supplied : undefined;
  }

  // --- sweep (caducidades) -------------------------------------------------

  /** Añade el límite al estado público sin meter el reloj dentro del motor. */
  private withTurnDeadline(
    previous: EngineState | null,
    state: EngineState,
    now: number,
  ): EngineState {
    if (isRoadmapGame(state.gameId)) {
      const roadmapState = state as RoadmapState;
      const previousRoadmapState =
        previous && isRoadmapGame(previous.gameId) ? (previous as RoadmapState) : null;
      return withRoadmapDeadline(
        previousRoadmapState,
        roadmapState,
        now,
      );
    }
    if (state.gameId === 'preciojusto') {
      const seconds = state.config.answerTimeSeconds;
      if (state.status !== 'playing' || state.phase !== 'input' || seconds === 0) {
        return { ...state, price: { ...state.price, deadlineAt: null } };
      }

      const sameRound =
        previous?.gameId === 'preciojusto' &&
        previous.status === 'playing' &&
        previous.phase === 'input' &&
        previous.round === state.round;
      const deadlineAt = sameRound
        ? (state.price.deadlineAt ?? previous.price.deadlineAt ?? now + seconds * 1000)
        : now + seconds * 1000;
      return { ...state, price: { ...state.price, deadlineAt } };
    }
    if (state.gameId !== 'chinchon') return state;

    const seconds = state.config.turnTimeSeconds;
    if (state.status !== 'playing' || state.turnSeat === null || seconds === 0) {
      return { ...state, turnDeadlineAt: null };
    }

    const sameTurn =
      previous?.gameId === 'chinchon' &&
      previous.status === 'playing' &&
      previous.turnSeat === state.turnSeat;
    const deadlineAt = sameTurn
      ? (state.turnDeadlineAt ?? previous.turnDeadlineAt ?? now + seconds * 1000)
      : now + seconds * 1000;
    return { ...state, turnDeadlineAt: deadlineAt };
  }

  /** Programa solo el comienzo de cada turno; robar no reinicia el reloj. */
  private syncTurnTimer(room: Room, previous: EngineState | null): void {
    const state = room.state;
    if (
      !state ||
      room.status !== 'playing' ||
      state.status !== 'playing' ||
      state.gameId !== 'chinchon' ||
      state.config.turnTimeSeconds === 0 ||
      state.turnSeat === null
    ) {
      this.clearTurnTimer(room.code);
      return;
    }

    const sameTurn =
      previous?.gameId === 'chinchon' &&
      previous.status === 'playing' &&
      previous.turnSeat === state.turnSeat;
    if (sameTurn && this.turnTimers.has(room.code)) return;

    this.clearTurnTimer(room.code);
    const deadlineAt = state.turnDeadlineAt ?? Date.now() + state.config.turnTimeSeconds * 1000;
    const delayMs = Math.max(0, deadlineAt - Date.now());
    const timer = setTimeout(() => {
      // Conservamos el handle mientras se ejecuta la jugada automática. Esta
      // consta de dos acciones (robar y descartar): si se borrase antes, la
      // primera volvería a programar un reloj completo para el mismo turno.
      if (this.turnTimers.get(room.code) !== timer) return;
      this.handleTurnTimeout(room.code, deadlineAt, Date.now());
      if (this.turnTimers.get(room.code) === timer) this.turnTimers.delete(room.code);
    }, delayMs);
    // Los temporizadores de una sala no deben impedir apagar el servidor.
    timer.unref?.();
    this.turnTimers.set(room.code, timer);
  }

  private clearTurnTimer(roomCode: string): void {
    const timer = this.turnTimers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.turnTimers.delete(roomCode);
  }

  /** Programa la revelación de Colores a partir de la primera respuesta. */
  private syncColorTimer(room: Room): void {
    const state = room.state;
    if (
      !state ||
      room.status !== 'playing' ||
      state.status !== 'playing' ||
      state.gameId !== 'colores' ||
      state.phase !== 'input' ||
      !state.colors ||
      state.colors.deadlineAt === null
    ) {
      this.clearColorTimer(room.code);
      return;
    }
    if (this.colorTimers.has(room.code)) return;

    const deadlineAt = state.colors.deadlineAt;
    const delayMs = Math.max(0, deadlineAt - Date.now());
    const timer = setTimeout(() => {
      if (this.colorTimers.get(room.code) !== timer) return;
      this.handleColorTimeout(room.code, deadlineAt, Date.now());
      if (this.colorTimers.get(room.code) === timer) this.colorTimers.delete(room.code);
    }, delayMs);
    timer.unref?.();
    this.colorTimers.set(room.code, timer);
  }

  private clearColorTimer(roomCode: string): void {
    const timer = this.colorTimers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.colorTimers.delete(roomCode);
  }

  /** Programa la revelación de Escala cuando la guía ya confirmó la pista. */
  private syncScaleTimer(room: Room): void {
    const state = room.state;
    if (
      !state ||
      room.status !== 'playing' ||
      state.status !== 'playing' ||
      state.gameId !== 'escala' ||
      state.phase !== 'input' ||
      !state.scale ||
      state.scale.deadlineAt === null
    ) {
      this.clearScaleTimer(room.code);
      return;
    }
    if (this.scaleTimers.has(room.code)) return;

    const deadlineAt = state.scale.deadlineAt;
    const delayMs = Math.max(0, deadlineAt - Date.now());
    const timer = setTimeout(() => {
      if (this.scaleTimers.get(room.code) !== timer) return;
      this.handleScaleTimeout(room.code, deadlineAt, Date.now());
      if (this.scaleTimers.get(room.code) === timer) this.scaleTimers.delete(room.code);
    }, delayMs);
    timer.unref?.();
    this.scaleTimers.set(room.code, timer);
  }

  private clearScaleTimer(roomCode: string): void {
    const timer = this.scaleTimers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.scaleTimers.delete(roomCode);
  }

  /** Programa la revelación de Precio justo al iniciar la ronda. */
  private syncPriceTimer(room: Room): void {
    const state = room.state;
    if (
      !state ||
      room.status !== 'playing' ||
      state.status !== 'playing' ||
      state.gameId !== 'preciojusto' ||
      state.phase !== 'input' ||
      state.price.deadlineAt === null
    ) {
      this.clearPriceTimer(room.code);
      return;
    }
    if (this.priceTimers.has(room.code)) return;

    const deadlineAt = state.price.deadlineAt;
    const delayMs = Math.max(0, deadlineAt - Date.now());
    const timer = setTimeout(() => {
      if (this.priceTimers.get(room.code) !== timer) return;
      this.handlePriceTimeout(room.code, deadlineAt, Date.now());
      if (this.priceTimers.get(room.code) === timer) this.priceTimers.delete(room.code);
    }, delayMs);
    timer.unref?.();
    this.priceTimers.set(room.code, timer);
  }

  private clearPriceTimer(roomCode: string): void {
    const timer = this.priceTimers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.priceTimers.delete(roomCode);
  }

  /** Programa el cierre de cualquier juego de preguntas independiente. */
  private syncRoadmapTimer(room: Room): void {
    const state = room.state;
    if (
      !state ||
      room.status !== 'playing' ||
      state.status !== 'playing' ||
      !isRoadmapGame(state.gameId)
    ) {
      this.clearRoadmapTimer(room.code);
      return;
    }
    const roadmapState = state as RoadmapState;
    if (roadmapState.phase !== 'input') {
      this.clearRoadmapTimer(room.code);
      return;
    }
    const deadlineAt = roadmapDeadlineAt(roadmapState);
    if (deadlineAt === null) {
      this.clearRoadmapTimer(room.code);
      return;
    }
    if (this.roadmapTimers.has(room.code)) return;

    const delayMs = Math.max(0, deadlineAt - Date.now());
    const timer = setTimeout(() => {
      if (this.roadmapTimers.get(room.code) !== timer) return;
      this.handleRoadmapTimeout(room.code, deadlineAt, Date.now());
      if (this.roadmapTimers.get(room.code) === timer) this.roadmapTimers.delete(room.code);
    }, delayMs);
    timer.unref?.();
    this.roadmapTimers.set(room.code, timer);
  }

  private clearRoadmapTimer(roomCode: string): void {
    const timer = this.roadmapTimers.get(roomCode);
    if (timer) clearTimeout(timer);
    this.roadmapTimers.delete(roomCode);
  }

  private handleRoadmapTimeout(roomCode: string, expectedDeadlineAt: number, now: number): void {
    const room = this.rooms.get(roomCode);
    const state = room?.state;
    if (
      !room ||
      !state ||
      room.status !== 'playing' ||
      state.status !== 'playing' ||
      !isRoadmapGame(state.gameId)
    ) {
      return;
    }
    const roadmapState = state as RoadmapState;
    if (roadmapState.phase !== 'input' || roadmapDeadlineAt(roadmapState) !== expectedDeadlineAt) return;
    if (expectedDeadlineAt > now) {
      this.clearRoadmapTimer(room.code);
      this.syncRoadmapTimer(room);
      return;
    }

    const actor = room.playersBySeat()[0];
    if (!actor) return;
    const finishAction: Extract<
      GameAction,
      { type: 'finishFlags' | 'finishCifras' | 'finishWho' | 'finishSentence' }
    > =
      roadmapState.gameId === 'banderas'
        ? { type: 'finishFlags' }
        : roadmapState.gameId === 'cifras'
          ? { type: 'finishCifras' }
          : roadmapState.gameId === 'quienloharia'
            ? { type: 'finishWho' }
            : { type: 'finishSentence' };
    const result = this.applyAction({
      roomCode,
      playerId: actor.playerId,
      clientActionId: `roadmap-timeout:${roomCode}:${roadmapState.version}:${randomUUID()}`,
      expectedVersion: roadmapState.version,
      action: finishAction,
      now,
    });
    if (result.ok) room.hooks.onRoadmapTimeout?.(room);
  }

  private handlePriceTimeout(roomCode: string, expectedDeadlineAt: number, now: number): void {
    const room = this.rooms.get(roomCode);
    const state = room?.state;
    if (
      !room ||
      !state ||
      room.status !== 'playing' ||
      state.status !== 'playing' ||
      state.gameId !== 'preciojusto' ||
      state.phase !== 'input' ||
      state.price.deadlineAt !== expectedDeadlineAt
    ) {
      return;
    }
    if (expectedDeadlineAt > now) {
      this.clearPriceTimer(room.code);
      this.syncPriceTimer(room);
      return;
    }

    const actor = room.playersBySeat()[0];
    if (!actor) return;
    const result = this.applyAction({
      roomCode,
      playerId: actor.playerId,
      clientActionId: `price-timeout:${roomCode}:${state.version}:${randomUUID()}`,
      expectedVersion: state.version,
      action: { type: 'finishPrice' },
      now,
    });
    if (result.ok) room.hooks.onPriceTimeout?.(room);
  }

  private handleScaleTimeout(roomCode: string, expectedDeadlineAt: number, now: number): void {
    const room = this.rooms.get(roomCode);
    const state = room?.state;
    if (
      !room ||
      !state ||
      room.status !== 'playing' ||
      state.status !== 'playing' ||
      state.gameId !== 'escala' ||
      state.phase !== 'input' ||
      !state.scale ||
      state.scale.deadlineAt !== expectedDeadlineAt
    ) {
      return;
    }
    if (expectedDeadlineAt > now) {
      this.clearScaleTimer(room.code);
      this.syncScaleTimer(room);
      return;
    }

    const actor = room.playersBySeat()[0];
    if (!actor) return;
    const result = this.applyAction({
      roomCode,
      playerId: actor.playerId,
      clientActionId: `scale-timeout:${roomCode}:${state.version}:${randomUUID()}`,
      expectedVersion: state.version,
      action: { type: 'finishScale' },
      now,
    });
    if (result.ok) room.hooks.onScaleTimeout?.(room);
  }

  private handleColorTimeout(roomCode: string, expectedDeadlineAt: number, now: number): void {
    const room = this.rooms.get(roomCode);
    const state = room?.state;
    if (
      !room ||
      !state ||
      room.status !== 'playing' ||
      state.status !== 'playing' ||
      state.gameId !== 'colores' ||
      state.phase !== 'input' ||
      !state.colors ||
      state.colors.deadlineAt !== expectedDeadlineAt
    ) {
      return;
    }
    if (expectedDeadlineAt > now) {
      this.clearColorTimer(room.code);
      this.syncColorTimer(room);
      return;
    }

    const actor = room.playersBySeat()[0];
    if (!actor) return;
    const result = this.applyAction({
      roomCode,
      playerId: actor.playerId,
      clientActionId: `color-timeout:${roomCode}:${state.version}:${randomUUID()}`,
      expectedVersion: state.version,
      action: { type: 'finishColors' },
      now,
    });
    if (result.ok) room.hooks.onColorTimeout?.(room);
  }

  /**
   * El tiempo agotado no cierra por el jugador: roba del mazo y tira una carta
   * suelta legal. Así el cierre sigue siendo una decisión explícita y la mano
   * nunca se queda bloqueada en mitad del turno.
   */
  private handleTurnTimeout(roomCode: string, expectedDeadlineAt: number, now: number): void {
    const room = this.rooms.get(roomCode);
    const state = room?.state;
    if (!room || !state || room.status !== 'playing' || state.gameId !== 'chinchon') return;
    // Un callback antiguo nunca puede jugar el turno nuevo. También cubre
    // ajustes hacia atrás del reloj del sistema reprogramando lo que reste.
    if (state.turnDeadlineAt !== expectedDeadlineAt) return;
    if (expectedDeadlineAt > now) {
      this.syncTurnTimer(room, null);
      return;
    }
    const seat = state.turnSeat;
    const player = seat === null ? undefined : state.players[seat];
    if (!player) return;
    let changed = false;
    const publish = () => {
      if (changed) room.hooks.onTurnTimeout?.(room);
    };

    const timedAction = (action: GameAction): boolean => {
      const current = room.state;
      if (!current || current.gameId !== 'chinchon') return false;
      const result = this.applyAction({
        roomCode,
        playerId: player.playerId,
        clientActionId: `timeout:${roomCode}:${current.version}:${randomUUID()}`,
        expectedVersion: current.version,
        action,
        now,
      });
      if (result.ok) changed = true;
      return result.ok;
    };

    if (state.turnPhase === 'draw' && !timedAction({ type: 'drawDeck' })) {
      publish();
      return;
    }

    const afterDraw = room.state;
    if (!afterDraw || afterDraw.gameId !== 'chinchon' || afterDraw.status !== 'playing') {
      publish();
      return;
    }
    const module = GAMES.chinchon;
    if (!module) {
      publish();
      return;
    }
    const view = module.getPlayerView(afterDraw, player.playerId);
    if (view.kind !== 'player' || view.gameId !== 'chinchon') {
      publish();
      return;
    }
    const action = decideChinchonTimeoutDiscard(view);
    if (!action || !timedAction(action)) {
      publish();
      return;
    }
    room.hooks.onToast?.(room, 'warn', `${player.nick} se quedó sin tiempo. Jugada automática.`);
    // Los temporizadores no pasan por un socket, así que no existe un handler
    // que pueda hacer el rebroadcast habitual. Sin esto, el servidor avanza
    // internamente pero los clientes siguen viendo el turno antiguo.
    // internamente pero los clientes siguen viendo el turno antiguo y la mesa
    // parece bloqueada.
    publish();
  }

  /**
   * Red de seguridad para procesos suspendidos o callbacks perdidos. El bucle
   * periódico llama a este método cada segundo; el deadline esperado evita
   * que pueda ejecutar dos veces un turno si coincide con su setTimeout.
   */
  expireOverdueTurns(now: number): number {
    let advanced = 0;
    for (const room of this.rooms.values()) {
      const state = room.state;
      if (
        room.status !== 'playing' ||
        !state ||
        state.gameId !== 'chinchon' ||
        state.status !== 'playing' ||
        state.turnDeadlineAt === null ||
        state.turnDeadlineAt === undefined ||
        state.turnDeadlineAt > now
      ) {
        continue;
      }

      const deadlineAt = state.turnDeadlineAt;
      const versionBefore = state.version;
      this.clearTurnTimer(room.code);
      this.handleTurnTimeout(room.code, deadlineAt, now);
      if (room.state?.version !== versionBefore) advanced += 1;
    }
    return advanced;
  }

  /** Respaldo para procesos suspendidos o callbacks perdidos del reloj de Colores. */
  expireOverdueColorAnswers(now: number): number {
    let revealed = 0;
    for (const room of this.rooms.values()) {
      const state = room.state;
      if (
        room.status !== 'playing' ||
        !state ||
        state.gameId !== 'colores' ||
        state.status !== 'playing' ||
        state.phase !== 'input' ||
        !state.colors ||
        state.colors.deadlineAt === null ||
        state.colors.deadlineAt > now
      ) {
        continue;
      }

      const deadlineAt = state.colors.deadlineAt;
      const versionBefore = state.version;
      this.clearColorTimer(room.code);
      this.handleColorTimeout(room.code, deadlineAt, now);
      if (room.state?.version !== versionBefore) revealed += 1;
    }
    return revealed;
  }

  /** Respaldo para procesos suspendidos o callbacks perdidos del reloj de Escala. */
  expireOverdueScaleAnswers(now: number): number {
    let revealed = 0;
    for (const room of this.rooms.values()) {
      const state = room.state;
      if (
        room.status !== 'playing' ||
        !state ||
        state.gameId !== 'escala' ||
        state.status !== 'playing' ||
        state.phase !== 'input' ||
        !state.scale ||
        state.scale.deadlineAt === null ||
        state.scale.deadlineAt > now
      ) {
        continue;
      }

      const deadlineAt = state.scale.deadlineAt;
      const versionBefore = state.version;
      this.clearScaleTimer(room.code);
      this.handleScaleTimeout(room.code, deadlineAt, now);
      if (room.state?.version !== versionBefore) revealed += 1;
    }
    return revealed;
  }

  /** Respaldo para procesos suspendidos o callbacks perdidos del reloj de Precio justo. */
  expireOverduePriceAnswers(now: number): number {
    let revealed = 0;
    for (const room of this.rooms.values()) {
      const state = room.state;
      if (
        room.status !== 'playing' ||
        !state ||
        state.gameId !== 'preciojusto' ||
        state.status !== 'playing' ||
        state.phase !== 'input' ||
        state.price.deadlineAt === null ||
        state.price.deadlineAt > now
      ) {
        continue;
      }

      const deadlineAt = state.price.deadlineAt;
      const versionBefore = state.version;
      this.clearPriceTimer(room.code);
      this.handlePriceTimeout(room.code, deadlineAt, now);
      if (room.state?.version !== versionBefore) revealed += 1;
    }
    return revealed;
  }

  /** Respaldo para procesos suspendidos o callbacks perdidos del roadmap. */
  expireOverdueRoadmapAnswers(now: number): number {
    let revealed = 0;
    for (const room of this.rooms.values()) {
      const state = room.state;
      if (
        room.status !== 'playing' ||
        !state ||
        state.status !== 'playing' ||
        !isRoadmapGame(state.gameId)
      ) {
        continue;
      }
      const roadmapState = state as RoadmapState;
      if (roadmapState.phase !== 'input') continue;
      const deadlineAt = roadmapDeadlineAt(roadmapState);
      if (deadlineAt === null || deadlineAt > now) continue;
      const versionBefore = roadmapState.version;
      this.clearRoadmapTimer(room.code);
      this.handleRoadmapTimeout(room.code, deadlineAt, now);
      if (room.state?.version !== versionBefore) revealed += 1;
    }
    return revealed;
  }

  /** Cierra cualquier sala que lleve demasiado tiempo sin mutación válida. */
  sweep(now: number): number {
    let closed = 0;
    for (const room of this.rooms.values()) {
      if (room.status === 'closed') continue;
      const humanPlayers = [...room.players.values()].filter((player) => !player.isBot);
      let presenceChanged = false;
      if (this.presenceTimeoutMs !== undefined) {
        for (const player of humanPlayers) {
          if (player.connected && now - player.lastSeenAt >= this.presenceTimeoutMs) {
            player.connected = false;
            player.socketId = null;
            player.disconnectedAt = now;
            presenceChanged = true;
          }
        }
      }
      if (presenceChanged) room.hooks.onPresence?.(room);
      const anyConnected = humanPlayers.some((player) => player.connected);
      // El plazo de abandono empieza cuando se desconecta el último móvil,
      // no en la última jugada. Si una sala llevaba una hora abierta y el
      // usuario bloquea el teléfono, debe conservar el margen completo para
      // volver a entrar. Los robots no mantienen una sala viva por sí solos.
      const lastHumanDisconnectAt = humanPlayers.reduce(
        (latest, player) => Math.max(latest, player.disconnectedAt ?? 0),
        0,
      );
      const unattendedSince = Math.max(room.lastActivityAt, lastHumanDisconnectAt);
      let shouldClose = false;
      if (anyConnected) {
        // Una sala abierta en algún móvil sigue viva aunque el grupo se
        // tome un descanso o esté leyendo una pantalla sin enviar acciones.
        shouldClose = false;
      } else if (this.inactivityTimeoutMs !== undefined) {
        shouldClose = now - unattendedSince >= this.inactivityTimeoutMs;
      } else if (room.status === 'lobby') {
        shouldClose = now - unattendedSince >= LOBBY_TTL_MS;
      } else {
        shouldClose = now - unattendedSince >= PLAYING_TTL_MS;
      }
      if (shouldClose) {
        this.closeRoom(room, 'expired');
        closed++;
      }
    }
    return closed;
  }

  /** Marca la sala como cerrada y la quita del mapa. */
  closeRoom(room: Room, reason: 'host_left' | 'empty' | 'expired'): void {
    this.clearTurnTimer(room.code);
    this.clearColorTimer(room.code);
    this.clearScaleTimer(room.code);
    this.clearPriceTimer(room.code);
    this.clearRoadmapTimer(room.code);
    room.status = 'closed';
    room.hooks.onClosed?.(room, reason);
    this.rooms.delete(room.code);
  }
}

// --- helpers ----------------------------------------------------------------

function roadmapDeadlineAt(state: RoadmapState): number | null {
  if (state.gameId === 'banderas') return state.flags.deadlineAt;
  if (state.gameId === 'cifras') return state.cifras.deadlineAt;
  if (state.gameId === 'quienloharia') return state.who.deadlineAt;
  return state.sentence.deadlineAt;
}

function setRoadmapDeadlineAt(state: RoadmapState, deadlineAt: number | null): RoadmapState {
  if (state.gameId === 'banderas') return { ...state, flags: { ...state.flags, deadlineAt } };
  if (state.gameId === 'cifras') return { ...state, cifras: { ...state.cifras, deadlineAt } };
  if (state.gameId === 'quienloharia') return { ...state, who: { ...state.who, deadlineAt } };
  return { ...state, sentence: { ...state.sentence, deadlineAt } };
}

function withRoadmapDeadline(
  previous: RoadmapState | null,
  state: RoadmapState,
  now: number,
): RoadmapState {
  const seconds = state.config.answerTimeSeconds;
  if (state.status !== 'playing' || state.phase !== 'input' || seconds === 0) {
    return setRoadmapDeadlineAt(state, null);
  }
  const previousDeadline = previous && previous.gameId === state.gameId ? roadmapDeadlineAt(previous) : null;
  const sameRound = previous?.gameId === state.gameId && previous.status === 'playing' && previous.phase === 'input' && previous.round === state.round;
  return setRoadmapDeadlineAt(state, sameRound ? (roadmapDeadlineAt(state) ?? previousDeadline ?? now + seconds * 1000) : now + seconds * 1000);
}

function randomSeed(): string {
  return randomUUID();
}

function initialScaleGroupIndex(
  config: GameConfig,
  gameId: GameId,
  seed: string,
  playerId: PlayerId,
  seat: number,
  existingPlayers: Iterable<PlayerRuntime>,
): number | null {
  if (gameId !== 'escala' || config.gameId !== 'escala' || config.groupMode !== 'groups') {
    return null;
  }

  const scaleConfig = config;
  const sizes = Array.from({ length: scaleConfig.groupCount }, () => 0);
  for (const player of existingPlayers) {
    const groupIndex = player.groupIndex;
    if (
      typeof groupIndex === 'number' &&
      Number.isInteger(groupIndex) &&
      groupIndex >= 0 &&
      groupIndex < scaleConfig.groupCount
    ) {
      sizes[groupIndex] = (sizes[groupIndex] ?? 0) + 1;
    }
  }

  const smallestSize = Math.min(...sizes);
  const candidates = sizes.flatMap((size, groupIndex) =>
    size === smallestSize ? [groupIndex] : [],
  );
  const selected = candidates[stableScaleHash(`${seed}:${playerId}:${seat}`) % candidates.length];
  return selected ?? 0;
}

/** Reparte de nuevo los jugadores cuando se activa o cambia el número de grupos. */
function randomizeScaleGroups(room: Room): void {
  if (room.gameId !== 'escala') return;
  const scaleConfig = room.config;
  if (scaleConfig.gameId !== 'escala') return;

  const players = room.playersBySeat().sort((a, b) => {
    const hashA = stableScaleHash(`${room.seed}:${a.playerId}:${a.seat}`);
    const hashB = stableScaleHash(`${room.seed}:${b.playerId}:${b.seat}`);
    return hashA - hashB || a.seat - b.seat;
  });
  players.forEach((player, index) => {
    player.groupIndex = index % scaleConfig.groupCount;
  });
}

function stableScaleHash(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/**
 * Input para `module.createInitialState`. Se construye en una variable con
 * nombre (no un literal pasado directo) a propósito: `CreateInitialStateInput`
 * (packages/engine/src/core/types.ts) no declara `roomCode`, pero ambos
 * reducers (Chinchón y Pocha) lo aceptan como campo adicional opcional para
 * poblar `state.roomCode` -- pasar un literal con esa propiedad de más
 * fallaría el chequeo de propiedades excedentes de TypeScript; pasar una
 * variable no.
 */
function dealInput(room: Room, precioJustoQuestions?: readonly PriceQuestion[]) {
  const input = {
    config: room.config,
    players: room.playersBySeat().map((p) => ({
      playerId: p.playerId,
      nick: p.nick,
      seat: p.seat,
      isBot: p.isBot,
      groupIndex: p.groupIndex ?? null,
    })),
    seed: room.seed,
    roomCode: room.code,
  };
  if (room.gameId === 'preciojusto' && precioJustoQuestions?.length) {
    return { ...input, precioJustoQuestions };
  }
  return input;
}

/** Primer apodo "Robot N" libre en la sala (único, como exige isNickTaken). */
function nextBotNick(room: Room): string {
  for (let n = 1; n <= room.config.maxPlayers; n++) {
    const candidate = `Robot ${n}`;
    if (!room.isNickTaken(candidate)) return candidate;
  }
  // No debería alcanzarse (nextFreeSeat ya garantiza hueco antes de llamar
  // aquí), pero deja un apodo válido en vez de romper el charset de nick.ts.
  return `Robot ${randomUUID().slice(0, 4)}`;
}
