// Manejadores de eventos cliente→servidor. Contrato §2.3 / §2.4 / P8.
//
// Cada handler:
//   1. Valida el payload con el esquema zod de @ronda/protocol (antes de tocar nada).
//   2. Aplica el límite de ritmo.
//   3. Llama al RoomManager.
//   4. Responde por el ack con Result.
//   5. Dispara la difusión correspondiente.
import type { Socket } from 'socket.io';
import type { TypedIoServer } from '../io.ts';
import type { RoomManager } from '../rooms/room-manager.ts';
import type { RateLimiter } from './rate-limit.ts';
import {
  clientPayloadSchemas,
  GameConfigSchema,
  type ClientToServerEvents,
  type Err,
  type GameConfig,
} from '@ronda/protocol';
import { broadcastRoom, broadcastClosed, broadcastReaction, broadcastToast } from './broadcast.ts';
import { scheduleBotTurn } from '../rooms/bot-driver.ts';

/** Estado por socket: a qué sala/jugador está ligado. */
export interface SocketState {
  roomCode: string | null;
  playerId: string | null;
  isScreen: boolean;
}

export function newSocketState(): SocketState {
  return { roomCode: null, playerId: null, isScreen: false };
}

export interface HandlerDeps {
  io: TypedIoServer;
  mgr: RoomManager;
  rateLimiter: RateLimiter;
  states: Map<string, SocketState>;
  now: () => number;
}

type ServerSocket = Socket<ClientToServerEvents>;
type Respond = (e: Err) => void;

/** Registra todos los handlers en un socket recién conectado. */
export function registerHandlers(socket: ServerSocket, deps: HandlerDeps): void {
  const sid = socket.id;
  deps.states.set(sid, newSocketState());

  // --- room:create ---
  socket.on('room:create', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:create', payload, respond)) return;
    // Parsea la config con defaults antes de pasarla al manager.
    const config = GameConfigSchema.parse(payload.config) as GameConfig;
    const r = deps.mgr.createRoom({
      gameId: payload.gameId,
      config,
      nick: payload.nick,
      now: deps.now(),
    });
    if (r.ok) bindAndBroadcast(deps, sid, r.value.roomCode, r.value.playerId);
    ack(r);
  });

  // --- room:join ---
  socket.on('room:join', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:join', payload, respond)) return;
    const r = deps.mgr.joinRoom({
      roomCode: payload.roomCode,
      nick: payload.nick,
      now: deps.now(),
    });
    if (r.ok) bindAndBroadcast(deps, sid, r.value.roomCode, r.value.playerId);
    ack(r);
  });

  // --- room:resume ---
  socket.on('room:resume', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:resume', payload, respond)) return;
    const r = deps.mgr.resumeByTokenGlobal({
      playerToken: payload.playerToken,
      now: deps.now(),
    });
    if (r.ok) {
      bindAndBroadcast(deps, sid, r.value.roomCode, r.value.playerId);
      // Telemetría P18: solo 'room:resume' cuenta como reconexión -- a
      // diferencia de room:create/room:join, que también pasan por
      // bindAndBroadcast pero son la primera conexión, no una recuperación.
      const room = deps.mgr.getRoomByCode(r.value.roomCode);
      room?.hooks.onTrack?.(room, 'reconnect', { playerId: r.value.playerId });
    }
    ack(r);
  });

  // --- room:config ---
  socket.on('room:config', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:config', payload, respond)) return;
    const st = requirePlayer(deps, sid, respond);
    if (!st) return;
    // El patch se aplica sobre la config existente; el manager lo mergea.
    // No re-validamos aquí (el manager ya tiene config válida).
    const r = deps.mgr.setConfig({
      roomCode: st.roomCode,
      playerId: st.playerId,
      patch: payload.patch as Partial<GameConfig>,
      now: deps.now(),
    });
    if (r.ok) rebroadcast(deps, st.roomCode);
    ack(r);
  });

  // --- room:start ---
  socket.on('room:start', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:start', payload, respond)) return;
    const st = requirePlayer(deps, sid, respond);
    if (!st) return;
    const r = deps.mgr.start({ roomCode: st.roomCode, playerId: st.playerId, now: deps.now() });
    if (r.ok) rebroadcast(deps, st.roomCode);
    ack(r);
  });

  // --- room:addBot ---
  socket.on('room:addBot', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:addBot', payload, respond)) return;
    const st = requirePlayer(deps, sid, respond);
    if (!st) return;
    const r = deps.mgr.addBot({ roomCode: st.roomCode, playerId: st.playerId, now: deps.now() });
    if (r.ok) rebroadcast(deps, st.roomCode);
    ack(r);
  });

  // --- room:kick ---
  socket.on('room:kick', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:kick', payload, respond)) return;
    const st = requirePlayer(deps, sid, respond);
    if (!st) return;
    // El socketId del expulsado se lee ANTES de `kick`: el manager borra al
    // jugador de `room.players`, así que después ya no habría por dónde
    // encontrarlo. Contrato P17: "Anfitrión expulsándote -> mensaje claro y
    // vuelta a la portada". El protocolo (§2.4) no tiene un evento propio
    // para esto (`room:closed` solo admite host_left/empty/expired), así
    // que en vez de tocarlo se usa un mecanismo ya estándar de socket.io:
    // cerrar el socket del expulsado con `disconnect(true)`. En el cliente
    // esto llega como 'disconnect' con reason 'io server disconnect' --que
    // socket.io nunca usa para una caída de red normal-- y store.ts lo
    // interpreta como "me han echado", no como "he perdido la conexión".
    const targetSocketId = deps.mgr
      .getRoomByCode(st.roomCode)
      ?.players.get(payload.playerId)?.socketId;
    const r = deps.mgr.kick({
      roomCode: st.roomCode,
      playerId: st.playerId,
      targetId: payload.playerId,
      now: deps.now(),
    });
    if (r.ok) {
      rebroadcast(deps, st.roomCode);
      if (targetSocketId) {
        deps.io.sockets.sockets.get(targetSocketId)?.disconnect(true);
      }
    }
    ack(r);
  });

  // --- room:leave ---
  socket.on('room:leave', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:leave', payload, respond)) return;
    const st = requirePlayer(deps, sid, respond);
    if (!st) return;
    const r = deps.mgr.leave({ roomCode: st.roomCode, playerId: st.playerId, now: deps.now() });
    ack(r);
    deps.states.delete(sid);
  });

  // --- room:close (anfitrión, en cualquier estado) ---
  socket.on('room:close', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:close', payload, respond)) return;
    const st = requirePlayer(deps, sid, respond);
    if (!st) return;
    // La sala se lee ANTES de cerrarla: closeByHost la borra de RoomManager,
    // así que después ya no habría por dónde difundir a sus miembros.
    const room = deps.mgr.getRoomByCode(st.roomCode);
    const r = deps.mgr.closeByHost({ roomCode: st.roomCode, playerId: st.playerId, now: deps.now() });
    if (r.ok && room) broadcastClosed(deps.io, room, 'host_left');
    ack(r);
  });

  // --- screen:attach ---
  socket.on('screen:attach', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'screen:attach', payload, respond)) return;
    const r = deps.mgr.attachScreen({ roomCode: payload.roomCode, socketId: sid, now: deps.now() });
    if (r.ok) {
      const st = deps.states.get(sid);
      if (st) {
        st.roomCode = payload.roomCode;
        st.isScreen = true;
      }
      rebroadcast(deps, payload.roomCode);
    }
    ack(r);
  });

  // --- game:action ---
  socket.on('game:action', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'game:action', payload, respond)) return;
    const st = requirePlayer(deps, sid, respond);
    if (!st) return;
    const r = deps.mgr.applyAction({
      roomCode: st.roomCode,
      playerId: st.playerId,
      clientActionId: payload.clientActionId,
      expectedVersion: payload.expectedVersion,
      action: payload.action,
      now: deps.now(),
    });
    if (r.ok) rebroadcast(deps, st.roomCode);
    ack(r);
  });

  // --- rematch:vote ---
  socket.on('rematch:vote', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'rematch:vote', payload, respond)) return;
    const st = requirePlayer(deps, sid, respond);
    if (!st) return;
    const r = deps.mgr.voteRematch({
      roomCode: st.roomCode,
      playerId: st.playerId,
      value: payload.value,
      now: deps.now(),
    });
    if (r.ok) rebroadcast(deps, st.roomCode);
    ack(r);
  });

  // --- reaction:send ---
  socket.on('reaction:send', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'reaction:send', payload, respond)) return;
    const st = requirePlayer(deps, sid, respond);
    if (!st) return;
    const r = deps.mgr.sendReaction({
      roomCode: st.roomCode,
      playerId: st.playerId,
      reaction: payload.reaction,
      now: deps.now(),
    });
    if (r.ok) {
      // No pasa por `rebroadcast`: una reacción no cambia el estado de la
      // partida, así que no hay snapshot nuevo que difundir ni turno de bot
      // que programar. Solo el evento cosmético.
      const room = deps.mgr.getRoomByCode(st.roomCode);
      if (room) broadcastReaction(deps.io, room, r.value);
    }
    ack(r.ok ? { ok: true, value: null } : r);
  });

  // --- room:stats ---
  socket.on('room:stats', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'room:stats', payload, respond)) return;
    // A diferencia del resto, no exige `requirePlayer`: la pantalla central
    // (`screen:attach`) también puede pedirlas, y no tiene playerId. Basta
    // con estar ligado a una sala.
    const st = deps.states.get(sid);
    if (!st || !st.roomCode) {
      respond({ ok: false, code: 'PLAYER_NOT_IN_ROOM' });
      return;
    }
    ack(deps.mgr.getStats({ roomCode: st.roomCode }));
  });

  // --- ping ---
  socket.on('ping', (payload, ack) => {
    const respond: Respond = (e) => ack(e);
    if (!guard(deps, sid, 'ping', payload, respond)) return;
    ack({ ok: true, value: { serverTime: deps.now() } });
  });
}

// --- helpers ----------------------------------------------------------------

/** Enlaza socket→player y difunde connection + snapshot. Nunca lanza. */
function bindAndBroadcast(deps: HandlerDeps, sid: string, roomCode: string, playerId: string): void {
  try {
    const st = deps.states.get(sid);
    if (st) {
      st.roomCode = roomCode;
      st.playerId = playerId;
    }
    deps.mgr.setConnected({
      roomCode,
      playerId,
      connected: true,
      socketId: sid,
      now: deps.now(),
    });
    rebroadcast(deps, roomCode);
  } catch {
    // La difusión nunca debe romper el flujo del handler.
  }
}

/**
 * Difunde el snapshot si la sala existe. Nunca lanza.
 * Se difiere con process.nextTick: en el mismo tick de la conexión, el socket
 * puede no haber completado su unión a su room de Socket.IO, y la primera
 * emisión se perdería. nextTick lo asegura.
 */
function rebroadcast(deps: HandlerDeps, roomCode: string): void {
  process.nextTick(() => {
    try {
      const room = deps.mgr.getRoomByCode(roomCode);
      if (room) broadcastRoom(deps.io, room);
      // Tras cada difusión, si le toca mover a un bot (turno de juego,
      // confirmar ronda o votar revancha), se programa su jugada.
      scheduleBotTurn(deps, roomCode);
    } catch {
      // La difusión nunca debe romper el flujo del handler.
    }
  });
}

/** Validación zod + rate-limit. Devuelve false si ya respondió el ack. */
function guard<E>(
  deps: HandlerDeps,
  sid: string,
  eventName: keyof typeof clientPayloadSchemas,
  payload: unknown,
  respondErr: Respond,
): payload is E {
  if (!deps.rateLimiter.take(sid, deps.now())) {
    respondErr({ ok: false, code: 'RATE_LIMITED' });
    return false;
  }
  const schema = clientPayloadSchemas[eventName];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    respondErr({ ok: false, code: 'INVALID_ACTION', detail: parsed.error.message });
    return false;
  }
  return true;
}

/** Requiere que el socket sea un jugador ligado a una sala. Si no, responde ack. */
function requirePlayer(
  deps: HandlerDeps,
  sid: string,
  respondErr: Respond,
): { roomCode: string; playerId: string } | null {
  const st = deps.states.get(sid);
  if (!st || !st.roomCode || !st.playerId) {
    respondErr({ ok: false, code: 'PLAYER_NOT_IN_ROOM' });
    return null;
  }
  return { roomCode: st.roomCode, playerId: st.playerId };
}

export { broadcastClosed, broadcastToast };
