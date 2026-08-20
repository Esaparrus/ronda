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
import { GAMES } from '@ronda/engine';
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
  if (gameId === 'laronda') return 3;
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
  private inactivityTimeoutMs: number | undefined;

  constructor(hooksFactory: () => RoomHooks = () => ({}), options: RoomManagerOptions = {}) {
    this.hooksFactory = hooksFactory;
    this.inactivityTimeoutMs = options.inactivityTimeoutMs;
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
    room.config = { ...room.config, ...input.patch, gameId: room.gameId } as GameConfig;
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

    const module = GAMES[room.gameId];
    if (!module) return err('GAME_NOT_FOUND');

    const initialState = prioritizeUnseenColorQuestions(
      room,
      module.createInitialState(dealInput(room)) as EngineState,
    );
    room.state = this.withTurnDeadline(null, initialState, input.now);
    rememberCurrentColorQuestion(room, room.state);
    room.status = 'playing';
    room.touch(input.now);
    this.syncTurnTimer(room, null);
    this.syncColorTimer(room);
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
          state.gameId === 'musical')
      ) {
        // Los modos sociales esperan a todos los jugadores activos para
        // revelar. Marcar la salida en el estado evita dejar una ronda
        // bloqueada esperando una respuesta que ya no llegará.
        room.state = {
          ...state,
          players: state.players.map((candidate) =>
            candidate.playerId === player.playerId ? { ...candidate, left: true } : candidate,
          ),
          ...(state.gameId === 'musical' && state.buzzedPlayerId === player.playerId
            ? { buzzedPlayerId: null }
            : {}),
        };
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
        room.gameId === 'escala');
    if (
      (input.action.type === 'setOrderCards' ||
        input.action.type === 'endOrder' ||
        partyNextRound ||
        input.action.type === 'musicSelectTrack' ||
        input.action.type === 'musicNextClip' ||
        input.action.type === 'musicNextRound') &&
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
        module.createInitialState(dealInput(room)) as EngineState,
      );
      room.state = this.withTurnDeadline(previousState, initialState, input.now);
      rememberCurrentColorQuestion(room, room.state);
      room.status = 'playing';
      this.syncTurnTimer(room, previousState);
      this.syncColorTimer(room);
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

  // --- sweep (caducidades) -------------------------------------------------

  /** Añade el límite al estado público sin meter el reloj dentro del motor. */
  private withTurnDeadline(
    previous: EngineState | null,
    state: EngineState,
    now: number,
  ): EngineState {
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

  /** Cierra cualquier sala que lleve demasiado tiempo sin mutación válida. */
  sweep(now: number): number {
    let closed = 0;
    for (const room of this.rooms.values()) {
      if (room.status === 'closed') continue;
      const humanPlayers = [...room.players.values()].filter((player) => !player.isBot);
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
    room.status = 'closed';
    room.hooks.onClosed?.(room, reason);
    this.rooms.delete(room.code);
  }
}

// --- helpers ----------------------------------------------------------------

function randomSeed(): string {
  return randomUUID();
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
function dealInput(room: Room) {
  return {
    config: room.config,
    players: room.playersBySeat().map((p) => ({
      playerId: p.playerId,
      nick: p.nick,
      seat: p.seat,
      isBot: p.isBot,
    })),
    seed: room.seed,
    roomCode: room.code,
  };
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
