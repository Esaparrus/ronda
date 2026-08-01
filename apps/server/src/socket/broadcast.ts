// Difusión de snapshots y eventos. Contrato §2.4 / §2.5 / P8.
//
// REGLA CRÍTICA DE SEGURIDAD: un socket solo recibe PlayerView de su propio
// playerId. La difusión NUNCA hace io.to(room).emit con datos privados.
//
// Para cada socket de jugador → getPlayerView(state, playerId).
// Para cada socket de pantalla → getTableView(state).
//
// En lobby (sin estado de motor) se difunde una vista mínima construida aquí,
// porque el motor no existe todavía.
import type { Server as IoServerType } from 'socket.io';
import type { TypedIoServer } from '../io.ts';
import type { Room } from '../rooms/room.ts';
import { GAMES } from '@ronda/engine';
import type {
  ChinchonCommonView,
  ChinchonPlayerView,
  ChinchonTableView,
  GameEvent,
} from '@ronda/protocol';

/** Versión del lobby (0). El motor arranca en versión 0. */
const LOBBY_VERSION = 0;

/**
 * Construye la parte común de la vista de lobby (jugadores públicos, config,
 * etc.). Tipada como `ChinchonCommonView` en vez del `CommonView` genérico
 * (unión discriminada desde P22): esta vista mínima de lobby es
 * deliberadamente Chinchón-shaped (turnPhase/deckCount/discardTop/
 * discardCount son vocabulario suyo) porque hoy solo se pueden crear salas
 * de Chinchón (`room-manager.ts` rechaza cualquier otro gameId al crear la
 * sala) -- una vista de lobby de Pocha de verdad es trabajo de P23/P24.
 */
function buildCommon(room: Room): ChinchonCommonView {
  return {
    roomCode: room.code,
    gameId: room.gameId as 'chinchon',
    config: room.config as ChinchonCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    round: 0,
    players: room.playersBySeat().map((p) => ({
      playerId: p.playerId,
      nick: p.nick,
      seat: p.seat,
      colorIndex: (p.seat % 4) as 0 | 1 | 2 | 3,
      score: 0,
      handCount: 0,
      connected: p.connected,
      isHost: p.isHost,
      eliminated: false,
    })),
    turnPlayerId: null,
    turnPhase: null,
    deckCount: 0,
    discardTop: null,
    discardCount: 0,
    roundResult: null,
    winnerId: null,
    rematchVotes: [],
  };
}

/** Vista de lobby para un jugador (sin mano, sin `me` privado relevante). */
function lobbyPlayerView(room: Room, playerId: string): ChinchonPlayerView {
  return {
    kind: 'player',
    ...buildCommon(room),
    me: {
      playerId,
      hand: [],
      bestMelds: [],
      deadwood: 0,
      canClose: false,
      closableDiscards: [],
      lockedCardId: null,
      availableActions: [],
    },
  };
}

function lobbyTableView(room: Room): ChinchonTableView {
  return { kind: 'table', ...buildCommon(room) };
}

/**
 * Difunde el snapshot a todos los miembros de la sala.
 * - En lobby: vista mínima (sin estado de motor).
 * - En partida: PlayerView/TableView del motor, censuradas.
 */
export function broadcastRoom(io: TypedIoServer, room: Room): void {
  // Lobby o sin estado: vista mínima.
  if (!room.state) {
    const version = LOBBY_VERSION;
    for (const p of room.players.values()) {
      if (!p.socketId) continue;
      io.to(p.socketId).emit('state:view', {
        version,
        view: lobbyPlayerView(room, p.playerId),
      });
    }
    for (const socketId of room.screens) {
      io.to(socketId).emit('state:view', { version, view: lobbyTableView(room) });
    }
    return;
  }

  const module = GAMES[room.gameId];
  if (!module) return;

  for (const p of room.players.values()) {
    if (!p.socketId) continue;
    const view = module.getPlayerView(room.state, p.playerId);
    io.to(p.socketId).emit('state:view', { version: room.state.version, view });
  }

  for (const socketId of room.screens) {
    const view = module.getTableView(room.state);
    io.to(socketId).emit('state:view', { version: room.state.version, view });
  }
}

/** Difunde eventos cosméticos (animaciones) a todos los miembros. */
export function broadcastEvents(
  io: TypedIoServer,
  room: Room,
  events: GameEvent[],
  version: number,
): void {
  if (events.length === 0) return;
  const payload = { version, items: events };
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('events', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('events', payload);
  }
}

/** Difunde un toast a todos. */
export function broadcastToast(
  io: TypedIoServer,
  room: Room,
  level: 'info' | 'warn',
  text: string,
): void {
  const payload = { level, text };
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('toast', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('toast', payload);
  }
}

/** Difunde el estado de conexión de los jugadores. */
export function broadcastConnection(
  io: TypedIoServer,
  room: Room,
): void {
  const payload = {
    players: room.playersBySeat().map((p) => ({
      playerId: p.playerId,
      connected: p.connected,
      isHost: p.isHost,
    })),
  };
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('connection', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('connection', payload);
  }
}

/** Avisa a todos los miembros de que la sala se cerró. */
export function broadcastClosed(
  io: TypedIoServer,
  room: Room,
  reason: 'host_left' | 'empty' | 'expired',
): void {
  const payload = { reason };
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('room:closed', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('room:closed', payload);
  }
}

// Reexport del tipo para que otros módulos no importen io.ts con side effects.
export type { IoServerType };
