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
  PlayerView,
  PochaCommonView,
  PochaPlayerView,
  PochaTableView,
  PublicPlayer,
  ReactionPayload,
  TableView,
} from '@ronda/protocol';

/** Versión del lobby (0). El motor arranca en versión 0. */
const LOBBY_VERSION = 0;

/** Jugadores públicos, comunes a la vista de lobby de cualquier juego. */
function buildLobbyPlayers(room: Room): PublicPlayer[] {
  return room.playersBySeat().map((p) => ({
    playerId: p.playerId,
    nick: p.nick,
    seat: p.seat,
    colorIndex: p.seat as PublicPlayer['colorIndex'],
    score: 0,
    handCount: 0,
    connected: p.connected,
    isHost: p.isHost,
    eliminated: false,
    // El lobby es común a todos los juegos y todavía no sabe de parejas: en
    // Mus las asigna el anfitrión moviendo asientos (§12.2) y el motor las
    // deriva del asiento al empezar la partida.
    teamIndex: null,
  }));
}

/**
 * Construye la parte común de la vista de lobby de Chinchón (vocabulario
 * turnPhase/deckCount/discardTop/discardCount).
 */
function buildChinchonLobbyCommon(room: Room): ChinchonCommonView {
  return {
    roomCode: room.code,
    gameId: 'chinchon',
    config: room.config as ChinchonCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
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

/** Misma idea que `buildChinchonLobbyCommon`, con la forma de Pocha (§9/§10.2). */
function buildPochaLobbyCommon(room: Room): PochaCommonView {
  return {
    roomCode: room.code,
    gameId: 'pocha',
    config: room.config as PochaCommonView['config'],
    status: room.status === 'closed' ? 'gameEnd' : room.status,
    round: 0,
    players: buildLobbyPlayers(room),
    turnPlayerId: null,
    winnerId: null,
    rematchVotes: [],
    trumpSuit: null,
    trumpCardId: null,
    roundSize: 0,
    dealerSeat: 0,
    bids: [],
    tricksWon: [],
    currentTrick: [],
    leadSuit: null,
    roundResult: null,
  };
}

/** Vista de lobby para un jugador (sin mano, sin `me` privado relevante). */
function lobbyPlayerView(room: Room, playerId: string): PlayerView {
  if (room.gameId === 'pocha') {
    const view: PochaPlayerView = {
      kind: 'player',
      ...buildPochaLobbyCommon(room),
      me: { playerId, hand: [], legalCardIds: [], availableActions: [] },
    };
    return view;
  }
  const view: ChinchonPlayerView = {
    kind: 'player',
    ...buildChinchonLobbyCommon(room),
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
  return view;
}

function lobbyTableView(room: Room): TableView {
  if (room.gameId === 'pocha') {
    const view: PochaTableView = { kind: 'table', ...buildPochaLobbyCommon(room) };
    return view;
  }
  const view: ChinchonTableView = { kind: 'table', ...buildChinchonLobbyCommon(room) };
  return view;
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

/**
 * Difunde una reacción a todos los miembros, incluida la pantalla central
 * (que es donde más gracia tiene) y el propio autor: así todos ven lo mismo
 * en el mismo momento y el emisor no tiene que pintar nada por su cuenta.
 */
export function broadcastReaction(
  io: TypedIoServer,
  room: Room,
  payload: ReactionPayload,
): void {
  for (const p of room.players.values()) {
    if (p.socketId) io.to(p.socketId).emit('reaction', payload);
  }
  for (const socketId of room.screens) {
    io.to(socketId).emit('reaction', payload);
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
