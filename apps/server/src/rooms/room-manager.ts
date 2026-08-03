// Gestión de salas en memoria. Contrato §6 / P6.
//
// Toda la validación de permisos vive aquí (anfitrión, jugador en sala, sala
// empezada). Toda mutación actualiza lastActivityAt. applyAction delega en
// GAMES[gameId].applyAction y NUNCA implementa reglas por su cuenta.
import {
  type GameAction,
  type GameConfig,
  type GameId,
  type PlayerId,
  type Result,
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

/** Mínimo de jugadores por juego (§9.2 Pocha: "fijo, no configurable"; §2.1
 * Chinchón: MIN_PLAYERS general). No hay una constante de contrato por juego
 * para esto (MIN_PLAYERS/MAX_PLAYERS de @ronda/protocol son el límite
 * ABSOLUTO de sala, §10.6, no el de un juego concreto). */
function minPlayersFor(gameId: GameId): number {
  return gameId === 'pocha' ? 3 : 2;
}

export interface JoinResult {
  roomCode: string;
  playerId: PlayerId;
  playerToken: string;
  seat: number;
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

  constructor(hooksFactory: () => RoomHooks = () => ({})) {
    this.hooksFactory = hooksFactory;
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

  joinRoom(input: {
    roomCode: string;
    nick: string;
    now: number;
  }): Result<JoinResult> {
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
  addBot(input: { roomCode: string; playerId: PlayerId; now: number }): Result<JoinResult> {
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
    };
    room.players.set(playerId, player);
    room.touch(input.now);
    room.hooks.onSnapshot?.(room);
    room.hooks.onTrack?.(room, 'player_joined', { nick, isBot: true });
    return ok({ roomCode: room.code, playerId, playerToken: token, seat });
  }

  // --- resume --------------------------------------------------------------

  resumeByToken(input: {
    roomCode: string;
    playerToken: string;
    now: number;
  }): Result<{ roomCode: string; playerId: PlayerId; seat: number }> {
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

  start(input: {
    roomCode: string;
    playerId: PlayerId;
    now: number;
  }): Result<null> {
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

    room.state = module.createInitialState(dealInput(room)) as EngineState;
    room.status = 'playing';
    room.touch(input.now);
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

  leave(input: {
    roomCode: string;
    playerId: PlayerId;
    now: number;
  }): Result<null> {
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

    // Si en partida quedan menos del mínimo del juego (2 en Chinchón, 3 en
    // Pocha, §9.2), termina la partida y gana quien quede con más puntos.
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
        if (room.state && connected[0]) {
          room.state = { ...room.state, status: 'gameEnd', winnerId: connected[0].playerId };
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

    const module = GAMES[room.gameId];
    if (!module) return err('GAME_NOT_FOUND');

    const currentState = room.state;
    const r = module.applyAction(currentState, input.playerId, input.action, input.now);
    if (!r.ok) return r;
    // El módulo devuelve estado tipado como `unknown` (AnyGameModule). Aquí
    // recuperamos el tipo concreto (Chinchón o Pocha).
    const newState = r.value.state as EngineState;
    room.state = newState;
    room.processedActions.set(input.clientActionId, newState.version);
    room.touch(input.now);

    // Eventos cosméticos (una sola vez por acción).
    if (r.value.events.length > 0) {
      room.hooks.onEvent?.(room, r.value.events, newState.version);
    }
    room.hooks.onSnapshot?.(room);

    // Detectar fin de ronda/partida para persistencia inmediata y telemetría.
    if (newState.status === 'roundEnd' || newState.status === 'gameEnd') {
      room.hooks.onPersist?.(room);
      if (newState.status === 'gameEnd') {
        room.status = 'gameEnd';
        room.hooks.onTrack?.(room, 'game_ended', { winnerId: newState.winnerId });
      } else {
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
    const allYes =
      connected.length > 0 && connected.every((p) => votes.includes(p.playerId));
    if (allYes) {
      // Reinicia la partida con los mismos asientos y marcador a cero.
      const module = GAMES[room.gameId];
      if (!module) return err('GAME_NOT_FOUND');
      room.seed = randomSeed();
      room.state = module.createInitialState(dealInput(room)) as EngineState;
      room.status = 'playing';
      room.hooks.onTrack?.(room, 'rematch', {});
    }
    room.hooks.onSnapshot?.(room);
    return ok(null);
  }

  // --- screen --------------------------------------------------------------

  attachScreen(input: { roomCode: string; socketId: string; now: number }): Result<{ roomCode: string }> {
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

  /** Cierra salas caducadas: lobby inactivo >2h, partida sin conectados >6h. */
  sweep(now: number): number {
    let closed = 0;
    for (const [code, room] of this.rooms) {
      let shouldClose = false;
      if (room.status === 'closed') continue;
      if (room.status === 'lobby') {
        if (now - room.lastActivityAt > LOBBY_TTL_MS) shouldClose = true;
      } else {
        const anyConnected = [...room.players.values()].some((p) => p.connected);
        if (!anyConnected && now - room.lastActivityAt > PLAYING_TTL_MS) shouldClose = true;
      }
      if (shouldClose) {
        this.closeRoom(room, 'expired');
        closed++;
        void code;
      }
    }
    return closed;
  }

  /** Marca la sala como cerrada y la quita del mapa. */
  closeRoom(room: Room, reason: 'host_left' | 'empty' | 'expired'): void {
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
