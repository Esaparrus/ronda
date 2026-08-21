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
  RoomStats,
  TableView,
} from '@ronda/protocol';
import { messageFor } from '@ronda/protocol';
import { clearToken, getToken, saveToken } from './token.ts';
import { connectIfNeeded, emitWithAck, getSocket } from './socket.ts';
import { createServerDownWatcher } from './serverDown.ts';
import { createUuid } from './uuid.ts';
import { recordDiagnostic } from './diagnostic-recorder.ts';
import { diagnosticContextFromState, reportClientIssue } from './diagnostics.ts';
import { waitForVersionChange } from './state-sync.ts';

export type ConnectionStatus = 'online' | 'reconnecting' | 'offline';

/** Motivo del cierre de sala, tal cual llega en `room:closed` (contrato §2.4). */
export type ClosedReason = 'host_left' | 'empty' | 'expired';

export interface RondaState {
  view: PlayerView | TableView | null;
  version: number;
  connection: ConnectionStatus;
  /** true mientras hay una `game:action` en vuelo: bloquea la interfaz. */
  pendingAction: boolean;
  /** Instante en que empezó la acción pendiente; permite detectar bloqueos lógicos. */
  pendingSince: number | null;
  /** Texto ya traducido (messages.ts) del último error, o null. */
  lastError: string | null;
  events: GameEvent[];
  roomCode: RoomCode | null;
  playerId: PlayerId | null;

  /**
   * Contrato P17: "socket caído más de 30s -> pantalla de error con botón
   * de reintento". `connection === 'reconnecting'` por sí solo no dice
   * cuánto llevamos así (socket.io reintenta indefinido con backoff); este
   * campo lo marca `true` solo cuando la caída lleva más del umbral
   * (serverDown.ts). Se resetea a `false` en cuanto vuelve a estar online.
   */
  serverDown: boolean;
  /**
   * Contrato P17: "Anfitrión expulsándote -> mensaje claro y vuelta a la
   * portada". El servidor no tiene un evento dedicado para esto (el
   * contrato de `room:closed` solo admite host_left/empty/expired): en vez
   * de tocar el protocolo congelado, el servidor cierra el socket del
   * expulsado con un `disconnect(true)` normal de socket.io, que en el
   * cliente llega como 'disconnect' con reason 'io server disconnect' --
   * la ÚNICA vez que el servidor fuerza una desconexión hoy, así que es una
   * señal inequívoca. Se resetea al empezar una sesión nueva.
   */
  kickedOut: boolean;
  /** Motivo del último `room:closed` recibido, o null. Se resetea igual que `kickedOut`. */
  closedReason: ClosedReason | null;

  createRoom: (gameId: GameId, config: GameConfig, nick: string) => Promise<boolean>;
  joinRoom: (roomCode: RoomCode, nick: string) => Promise<boolean>;
  /** Retoma una sesión con el token guardado para `roomCode`. */
  resume: (roomCode: RoomCode) => Promise<boolean>;
  sendAction: (action: GameAction) => Promise<void>;
  leave: () => Promise<void>;
  /** Solo anfitrión: cierra la sala para todos, en lobby o en partida. */
  closeRoom: () => Promise<boolean>;
  /**
   * Pantalla central (`/mesa/[code]`, contrato P15 / §6 "Pantalla central").
   * Se conecta solo con el código de sala, SIN token: nunca llama a
   * saveToken. Recibe únicamente TableView (nunca game:action ni room:*).
   * No comparte código con joinRoom/resume a propósito: aunque el payload
   * final que via al socket es parecido, la ausencia de token es una
   * garantía de seguridad del contrato, no un detalle de implementación,
   * así que se mantiene como su propia función explícita en vez de una
   * rama condicional dentro de joinRoom.
   */
  attachScreen: (roomCode: RoomCode) => Promise<boolean>;

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
  /**
   * Añade un jugador robot a la sala (modo "contra la máquina"): fuera del
   * MVP original, pedido explícitamente para poder probar sin una segunda
   * persona. Solo anfitrión, solo en lobby.
   */
  addBot: (delayMs?: number) => Promise<boolean>;
  /**
   * Intercambia el asiento de dos jugadores. Solo anfitrión, solo en lobby.
   * Existe por Mus: las parejas salen del asiento (`seat % 2`, §12.2) y las
   * asigna el anfitrión moviendo gente de sitio.
   */
  swapSeats: (aPlayerId: PlayerId, bPlayerId: PlayerId) => Promise<boolean>;
  /** Solo anfitrión, solo en el lobby de Escala por grupos. */
  setPlayerGroup: (targetPlayerId: PlayerId, groupIndex: number) => Promise<boolean>;

  /**
   * Voto de revancha en fin de partida (contrato P16 / §2.3). Evento propio
   * `rematch:vote`, no una `GameAction` de `game:action`: el servidor lo
   * gestiona fuera del reducer del motor (no consume ronda ni versión de
   * juego), así que se modela como su propia función de store en vez de
   * pasar por `sendAction`, igual que `updateConfig`/`startRoom`/`kickPlayer`
   * en P14. `value: false` retira el voto (cambiar de opinión).
   */
  voteRematch: (value: boolean) => Promise<boolean>;

  /** Pide las estadísticas de la sala. null si fallan o no hay conexión. */
  fetchStats: () => Promise<RoomStats | null>;
}

export const useRondaStore = create<RondaState>((set, get) => {
  const socket = getSocket();

  // --- servidor → cliente, cableado una sola vez por socket -----------------

  socket.on('state:view', (payload) => {
    set({ view: payload.view, version: payload.version });
    const view = payload.view as unknown as Record<string, unknown>;
    const me = view.me as Record<string, unknown> | undefined;
    const party = view.party as Record<string, unknown> | undefined;
    recordDiagnostic('state:view', {
      version: payload.version,
      viewKind: typeof view.kind === 'string' ? view.kind : null,
      gameId: typeof view.gameId === 'string' ? view.gameId : null,
      status: typeof view.status === 'string' ? view.status : null,
      phase:
        typeof view.phase === 'string'
          ? view.phase
          : typeof party?.phase === 'string'
            ? party.phase
            : typeof view.turnPhase === 'string'
              ? view.turnPhase
              : null,
      availableActions: Array.isArray(me?.availableActions)
        ? me.availableActions
            .filter((item): item is string => typeof item === 'string')
            .slice(0, 20)
        : [],
    });
  });

  socket.on('events', (payload) => {
    set((s) => ({ events: [...s.events, ...payload.items] }));
    recordDiagnostic('game:events', {
      version: payload.version,
      types: payload.items.map((item) => item.t).slice(0, 20),
    });
  });

  socket.on('room:closed', (payload) => {
    recordDiagnostic('room:closed', { reason: payload.reason });
    const code = get().roomCode;
    if (code) clearToken(code);
    set({
      view: null,
      version: 0,
      roomCode: null,
      playerId: null,
      closedReason: payload.reason,
      lastError: messageFor('ROOM_CLOSED'),
    });
  });

  // 'toast' no vive en este store: no es uno de los campos que pide el
  // contrato (view/version/connection/pendingAction/lastError/events) y es
  // un aviso puntual, no estado persistente. Las pantallas que lo quieran
  // mostrar se suscriben directamente a `getSocket().on('toast', ...)`.

  // --- ciclo de vida de la conexión -------------------------------------------

  const serverDownWatcher = createServerDownWatcher((down) => set({ serverDown: down }));

  socket.on('connect', () => {
    recordDiagnostic('socket:connect', { socketId: socket.id ?? null });
    serverDownWatcher.reconnected();
    set({ connection: 'online' });
  });

  socket.on('disconnect', (reason) => {
    recordDiagnostic('socket:disconnect', { reason });
    if (reason === 'io server disconnect') {
      // El servidor ha cerrado el socket a propósito: hoy, solo lo hace al
      // expulsar a alguien (ver comentario de `kickedOut` en RondaState).
      // socket.io NO reintenta solo tras este motivo -- hace falta llamar a
      // connect() explícitamente para volver a intentarlo -- así que no se
      // arranca el vigilante de caída ni se marca 'reconnecting': es una
      // sesión terminada, no una red inestable.
      const code = get().roomCode;
      if (code) clearToken(code);
      serverDownWatcher.reconnected(); // por si acaso: no debe quedar pendiente
      set({
        view: null,
        version: 0,
        roomCode: null,
        playerId: null,
        connection: 'offline',
        kickedOut: true,
      });
      return;
    }
    // 'io client disconnect' = lo cerramos nosotros (leave()): no reintenta.
    // Cualquier otro motivo ('transport close', 'ping timeout'...) sí
    // dispara reconexión automática (reconnection: true).
    if (reason === 'io client disconnect') {
      serverDownWatcher.reconnected();
      set({ connection: 'offline' });
      return;
    }
    serverDownWatcher.disconnected();
    set({ connection: 'reconnecting' });
  });

  socket.io.on('reconnect_attempt', (attempt) => {
    recordDiagnostic('socket:reconnect_attempt', { attempt });
    set({ connection: 'reconnecting' });
  });
  socket.io.on('reconnect_failed', () => {
    recordDiagnostic('socket:reconnect_failed');
    set({ connection: 'offline' });
  });
  socket.io.on('reconnect', () => {
    recordDiagnostic('socket:reconnect');
    serverDownWatcher.reconnected();
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
    pendingSince: null,
    lastError: null,
    events: [],
    roomCode: null,
    playerId: null,
    serverDown: false,
    kickedOut: false,
    closedReason: null,

    async createRoom(gameId, config, nick) {
      connectIfNeeded(socket);
      const res = await emitWithAck(socket, 'room:create', { gameId, config, nick });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      if (res.value.playerToken) saveToken(res.value.roomCode, res.value.playerToken);
      set({
        roomCode: res.value.roomCode,
        playerId: res.value.playerId,
        lastError: null,
        kickedOut: false,
        closedReason: null,
      });
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
      set({
        roomCode: res.value.roomCode,
        playerId: res.value.playerId,
        lastError: null,
        kickedOut: false,
        closedReason: null,
      });
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
        // El token puede sobrevivir en localStorage aunque el servidor haya
        // caducado la sala mientras esta pestaña estaba cerrada. No debemos
        // seguir mostrando una partida que ya no se puede retomar.
        if (
          res.code === 'ROOM_NOT_FOUND' ||
          res.code === 'ROOM_CLOSED' ||
          res.code === 'INVALID_TOKEN'
        ) {
          clearToken(roomCode);
        }
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({
        roomCode: res.value.roomCode,
        playerId: res.value.playerId,
        lastError: null,
        kickedOut: false,
        closedReason: null,
      });
      return true;
    },

    async sendAction(action) {
      // Nunca dos acciones a la vez: si ya hay una en vuelo, se ignora.
      // Contrato P17: "acciones bloqueadas" mientras no haya conexión sana
      // -- igual de silencioso que el bloqueo por pendingAction: la señal
      // visible ya la da el Banner (banda + cartel) y los botones
      // deshabilitados, no hace falta un lastError adicional aquí.
      if (get().pendingAction || get().connection !== 'online') {
        recordDiagnostic('action:ignored', {
          actionType: action.type,
          pendingAction: get().pendingAction,
          connection: get().connection,
        });
        return;
      }
      set({ pendingAction: true, pendingSince: Date.now(), lastError: null });

      const attempt = async () => {
        const clientActionId = createUuid();
        const expectedVersion = get().version;
        const result = await emitWithAck(socket, 'game:action', {
          clientActionId,
          expectedVersion,
          action,
        });
        return { result, expectedVersion };
      };

      try {
        const first = await attempt();
        if (first.result.ok) return;

        if (first.result.code === 'STALE_VERSION') {
          // Orden es la excepción deliberada: si dos cartas salen a la vez,
          // solo cuenta la petición que el servidor procesó primero.
          if (action.type === 'playNumber') return;

          const synchronized = await waitForVersionChange(
            socket,
            first.expectedVersion,
            () => get().version,
          );
          if (!synchronized) {
            recordDiagnostic('state:sync_timeout', {
              expectedVersion: first.expectedVersion,
              currentVersion: get().version,
              actionType: action.type,
            });
            const state = get();
            void reportClientIssue('state_sync_timeout', diagnosticContextFromState(state));

            // Pide un snapshot fresco con la sesión ya guardada. Aunque esta
            // recuperación también falle, el finally libera siempre la interfaz.
            const code = state.roomCode;
            const token = code ? getToken(code) : null;
            if (token && socket.connected) {
              const resync = await emitWithAck(socket, 'room:resume', { playerToken: token });
              recordDiagnostic('state:resync', { ok: resync.ok });
            }
            set({ lastError: messageFor('INTERNAL') });
            return;
          }

          // Una sola repetición con la versión fresca.
          const retry = await attempt();
          set({ lastError: retry.result.ok ? null : messageFor(retry.result.code) });
          return;
        }

        set({ lastError: messageFor(first.result.code) });
      } catch (error) {
        recordDiagnostic('action:exception', { actionType: action.type });
        const state = get();
        void reportClientIssue('client_error', diagnosticContextFromState(state), error);
        set({ lastError: messageFor('INTERNAL') });
      } finally {
        set({ pendingAction: false, pendingSince: null });
      }
    },

    async attachScreen(roomCode) {
      connectIfNeeded(socket);
      const res = await emitWithAck(socket, 'screen:attach', { roomCode });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      // Sin playerId (una pantalla no es un jugador) y, deliberadamente,
      // sin guardar token: la pantalla central no tiene sesión que retomar.
      set({
        roomCode: res.value.roomCode,
        playerId: null,
        lastError: null,
        kickedOut: false,
        closedReason: null,
      });
      return true;
    },

    async leave() {
      const code = get().roomCode;
      await emitWithAck(socket, 'room:leave', {});
      if (code) clearToken(code);
      set({ view: null, version: 0, roomCode: null, playerId: null, events: [] });
    },

    async closeRoom() {
      const res = await emitWithAck(socket, 'room:close', {});
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      // La limpieza del estado local la hace el propio handler de
      // 'room:closed' de arriba: el servidor difunde ese evento a todos los
      // miembros de la sala, incluido el anfitrión que la acaba de cerrar.
      return true;
    },

    async updateConfig(patch) {
      // Contrato P17: acciones bloqueadas mientras no haya conexión sana.
      if (get().connection !== 'online') return false;
      const res = await emitWithAck(socket, 'room:config', { patch });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },

    async startRoom() {
      if (get().connection !== 'online') return false;
      const res = await emitWithAck(socket, 'room:start', {});
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },

    async addBot(delayMs = 2_500) {
      if (get().connection !== 'online') return false;
      const res = await emitWithAck(socket, 'room:addBot', { delayMs });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },

    async swapSeats(aPlayerId, bPlayerId) {
      if (get().connection !== 'online') return false;
      const res = await emitWithAck(socket, 'room:swapSeats', { aPlayerId, bPlayerId });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },

    async setPlayerGroup(targetPlayerId, groupIndex) {
      if (get().connection !== 'online') return false;
      const res = await emitWithAck(socket, 'room:setGroup', { targetPlayerId, groupIndex });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },

    async kickPlayer(playerId) {
      if (get().connection !== 'online') return false;
      const res = await emitWithAck(socket, 'room:kick', { playerId });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },

    async voteRematch(value) {
      if (get().connection !== 'online') return false;
      const res = await emitWithAck(socket, 'rematch:vote', { value });
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return false;
      }
      set({ lastError: null });
      return true;
    },

    async fetchStats() {
      if (get().connection !== 'online') return null;
      const res = await emitWithAck(socket, 'room:stats', {});
      if (!res.ok) {
        set({ lastError: messageFor(res.code) });
        return null;
      }
      return res.value;
    },
  };
});
