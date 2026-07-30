// Estado central de la app (Zustand). Contrato P12 / §2.3, §2.4, §6.
//
// El cliente NUNCA calcula si una jugada es válida: solo guarda lo que el
// servidor manda (`view.me.availableActions`, `closableDiscards`...) y
// reenvía la intención del jugador tal cual. Nada de lógica de reglas aquí.
import { create } from 'zustand';
import type {
  GameAction,
  GameConfig,
  GameEvent,
  GameId,
  PlayerId,
  PlayerView,
  RoomCode,
  TableView,
} from '@ronda/protocol';
import { messageFor } from '@ronda/protocol';
import { clearToken, getToken, saveToken } from './token.ts';
import { connectIfNeeded, emitWithAck, getSocket } from './socket.ts';

export type ConnectionStatus = 'online' | 'reconnecting' | 'offline';

export interface RondaState {
  view: PlayerView | TableView | null;
  version: number;
  connection: ConnectionStatus;
  /** true mientras hay una `game:action` en vuelo: bloquea la interfaz. */
  pendingAction: boolean;
  /** Texto ya traducido (messages.ts) del último error, o null. */
  lastError: string | null;
  events: GameEvent[];
  roomCode: RoomCode | null;
  playerId: PlayerId | null;

  createRoom: (gameId: GameId, config: GameConfig, nick: string) => Promise<boolean>;
  joinRoom: (roomCode: RoomCode, nick: string) => Promise<boolean>;
  /** Retoma una sesión con el token guardado para `roomCode`. */
  resume: (roomCode: RoomCode) => Promise<boolean>;
  sendAction: (action: GameAction) => Promise<void>;
  leave: () => Promise<void>;

  // Controles de anfitrión en el lobby (contrato P14: "cambiar variantes,
  // expulsar, y Empezar"). No estaban en el alcance de P12 -solo pedía
  // createRoom/joinRoom/resume/sendAction/leave-, pero P14 los necesita para
  // el lobby y son del mismo tipo de acción (payload+ack sobre el socket
  // único), así que se añaden aquí en vez de saltarse el store.
  /** Solo anfitrión, solo en lobby. */
  updateConfig: (patch: Partial<GameConfig>) => Promise<boolean>;
  /** Solo anfitrión. */
  startRoom: () => Promise<boolean>;
  /** Solo anfitrión. */
  kickPlayer: (playerId: PlayerId) => Promise<boolean>;
}

export const useRondaStore = create<RondaState>((set, get) => {
  const socket = getSocket();

  // --- servidor → cliente, cableado una sola vez por socket -----------------

  socket.on('state:view', (payload) => {
    set({ view: payload.view, version: payload.version });
  });

  socket.on('events', (payload) => {
    set((s) => ({ events: [...s.events, ...payload.items] }));
  });

  socket.on('room:closed', () => {
    const code = get().roomCode;
    if (code) clearToken(code);
    set({ view: null, version: 0, roomCode: null, playerId: null });
  });

  // 'toast' no vive en este store: no es uno de los campos que pide el
  // contrato (view/version/connection/pendingAction/lastError/events) y es
  // un aviso puntual, no estado persistente. Las pantallas que lo quieran
  // mostrar se suscriben directamente a `getSocket().on('toast', ...)`.

  // --- ciclo de vida de la conexión -------------------------------------------

  socket.on('connect', () => set({ connection: 'online' }));

  socket.on('disconnect', (reason) => {
    // 'io client disconnect' = lo cerramos nosotros (leave()): no reintenta.
    // Cualquier otro motivo ('transport close', 'ping timeout', 'io server
    // disconnect'...) sí dispara reconexión automática (reconnection: true).
    set({ connection: reason === 'io client disconnect' ? 'offline' : 'reconnecting' });
  });

  socket.io.on('reconnect_attempt', () => set({ connection: 'reconnecting' }));
  socket.io.on('reconnect_failed', () => set({ connection: 'offline' }));
  socket.io.on('reconnect', () => {
    set({ connection: 'online' });
    // Reconexión (no la primera conexión): si hay token guardado para la
    // sala actual, retoma la sesión sola. Contrato P12.
    const code = get().roomCode;
    const token = code ? getToken(code) : null;
    if (code && token) {
      void emitWithAck(socket, 'room:resume', { playerToken: token });
    }
  });

  return {
    view: null,
    version: 0,
    connection: 'offline',
    pendingAction: false,
    lastError: null,
    events: [],
    roomCode: null,
    playerId: null,

    async createRoom(gameId, config, nick) {
      connectIfNeeded(socket);
      const res = await emitWithAck(socket, 'room:create', { gameId, config, nick });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      if (res.value.playerToken) saveToken(res.value.roomCode, res.value.playerToken);
      set({ roomCode: res.value.roomCode, playerId: res.value.playerId, lastError: null });
      return true;
    },

    async joinRoom(roomCode, nick) {
      connectIfNeeded(socket);
      const res = await emitWithAck(socket, 'room:join', { roomCode, nick });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      if (res.value.playerToken) saveToken(res.value.roomCode, res.value.playerToken);
      set({ roomCode: res.value.roomCode, playerId: res.value.playerId, lastError: null });
      return true;
    },

    async resume(roomCode) {
      const token = getToken(roomCode);
      if (!token) {
        set({ lastError: messageFor('INVALID_TOKEN') });
        return false;
      }
      connectIfNeeded(socket);
      const res = await emitWithAck(socket, 'room:resume', { playerToken: token });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ roomCode: res.value.roomCode, playerId: res.value.playerId, lastError: null });
      return true;
    },

    async sendAction(action) {
      // Nunca dos acciones a la vez: si ya hay una en vuelo, se ignora.
      if (get().pendingAction) return;
      set({ pendingAction: true, lastError: null });

      const attempt = () => {
        const clientActionId = crypto.randomUUID();
        const expectedVersion = get().version;
        return emitWithAck(socket, 'game:action', { clientActionId, expectedVersion, action });
      };

      const res = await attempt();

      if (res.ok) {
        set({ pendingAction: false });
        return;
      }

      if (res.code === 'STALE_VERSION') {
        // Espera al siguiente state:view (la versión fresca) y reintenta
        // UNA sola vez, tal cual el contrato. Si el reintento también falla
        // (incluso con otro STALE_VERSION), no se vuelve a intentar.
        await new Promise<void>((resolve) => socket.once('state:view', () => resolve()));
        const retry = await attempt();
        set({ pendingAction: false, lastError: retry.ok ? null : messageFor(retry.code) });
        return;
      }

      set({ pendingAction: false, lastError: messageFor(res.code) });
    },

    async leave() {
      const code = get().roomCode;
      await emitWithAck(socket, 'room:leave', {});
      if (code) clearToken(code);
      set({ view: null, version: 0, roomCode: null, playerId: null, events: [] });
    },

    async updateConfig(patch) {
      const res = await emitWithAck(socket, 'room:config', { patch });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },

    async startRoom() {
      const res = await emitWithAck(socket, 'room:start', {});
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },

    async kickPlayer(playerId) {
      const res = await emitWithAck(socket, 'room:kick', { playerId });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },
  };
});
