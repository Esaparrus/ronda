// Eventos de Socket.IO (cliente↔servidor) y esquemas zod de los payloads de
// entrada (los que el servidor valida ANTES de tocar nada). Contrato §2.3, §2.4.
import { z } from 'zod';
import { GameActionSchema } from './actions.ts';
import { ChinchonConfigSchema, GameConfigSchema, PochaConfigSchema } from './config.ts';
import type { GameEvent } from './events.ts';
import type { GameId, PlayerId, RoomCode } from './ids.ts';
import type { PlayerView, TableView } from './views.ts';
import type { GameConfig } from './config.ts';
import type { Result } from './result.ts';

// --- acks: respuestas de los manejadores ------------------------------------

export interface JoinAck {
  roomCode: RoomCode;
  playerId: PlayerId;
  playerToken?: string; // presente en create/join; ausente en resume
  seat: number;
}

export interface ConfigAck {
  config: GameConfig;
}

export interface GameActionAck {
  version: number;
}

export interface PingAck {
  serverTime: number;
}

// --- eventos cliente → servidor (con ack tipado) ----------------------------
//
// Cada payload de entrada tiene su esquema zod en `clientPayloadSchemas`.
// El servidor valida el payload con el esquema correspondiente antes de actuar.

export interface ClientToServerEvents {
  'room:create': (
    payload: { gameId: GameId; config: GameConfig; nick: string },
    ack: (res: Result<JoinAck>) => void,
  ) => void;
  'room:join': (
    payload: { roomCode: RoomCode; nick: string },
    ack: (res: Result<JoinAck>) => void,
  ) => void;
  'room:resume': (
    payload: { playerToken: string },
    ack: (res: Result<{ roomCode: RoomCode; playerId: PlayerId; seat: number }>) => void,
  ) => void;
  'room:config': (
    payload: { patch: Partial<GameConfig> },
    ack: (res: Result<ConfigAck>) => void,
  ) => void;
  'room:start': (payload: Record<string, never>, ack: (res: Result<null>) => void) => void;
  'room:kick': (payload: { playerId: PlayerId }, ack: (res: Result<null>) => void) => void;
  'room:leave': (payload: Record<string, never>, ack: (res: Result<null>) => void) => void;
  'screen:attach': (
    payload: { roomCode: RoomCode },
    ack: (res: Result<{ roomCode: RoomCode }>) => void,
  ) => void;
  'game:action': (
    payload: {
      clientActionId: string;
      expectedVersion: number;
      action: z.infer<typeof GameActionSchema>;
    },
    ack: (res: Result<GameActionAck>) => void,
  ) => void;
  'rematch:vote': (payload: { value: boolean }, ack: (res: Result<null>) => void) => void;
  ping: (payload: Record<string, never>, ack: (res: Result<PingAck>) => void) => void;
}

// --- eventos servidor → cliente ---------------------------------------------

export interface StateViewPayload {
  version: number;
  view: PlayerView | TableView;
}

export interface RoomClosedPayload {
  reason: 'host_left' | 'empty' | 'expired';
}

export interface EventsPayload {
  version: number;
  items: GameEvent[];
}

export interface ToastPayload {
  level: 'info' | 'warn';
  text: string;
}

export interface ConnectionPlayer {
  playerId: PlayerId;
  connected: boolean;
  isHost: boolean;
}

export interface ConnectionPayload {
  players: ConnectionPlayer[];
}

export interface ServerToClientEvents {
  'state:view': (payload: StateViewPayload) => void;
  'room:closed': (payload: RoomClosedPayload) => void;
  events: (payload: EventsPayload) => void;
  toast: (payload: ToastPayload) => void;
  connection: (payload: ConnectionPayload) => void;
}

// --- esquemas zod de los payloads de entrada (validación en el servidor) ----
//
// Clave = nombre del evento. Solo figuran los eventos que el cliente envía.
// El servidor hace: schemas[eventName]?.parse(payload) antes de tocar nada.

const roomCreateSchema = z.object({
  // Contrato §10.1 (P21/P22): GameId se ensanchó a 'chinchon' | 'pocha'. El
  // cliente de hoy (apps/web) todavía solo sabe crear salas de Chinchón
  // (P24, interfaz de Pocha, sigue sin empezar): esta línea acepta ambos
  // valores a nivel de protocolo -- room-manager.ts (apps/server) sigue
  // rechazando explícitamente cualquier gameId que no sea 'chinchon' con
  // GAME_NOT_FOUND hasta que P23 lo cablee de verdad.
  gameId: z.union([z.literal('chinchon'), z.literal('pocha')]),
  config: GameConfigSchema,
  nick: z.string(),
});

const roomJoinSchema = z.object({
  roomCode: z.string(),
  nick: z.string(),
});

const roomResumeSchema = z.object({
  playerToken: z.string(),
});

const roomConfigSchema = z.object({
  // Partial del esquema de config: solo campos presentes, sin defaults.
  // GameConfigSchema es una unión discriminada (§10.2, P22) y
  // ZodDiscriminatedUnion no expone `.partial()` directamente (a diferencia
  // de ZodObject): se valida como la unión de los parciales de cada miembro
  // en su lugar. room-manager.ts sigue siendo quien decide, en runtime, qué
  // campos tienen sentido para el `gameId` real de la sala.
  patch: z.union([ChinchonConfigSchema.partial(), PochaConfigSchema.partial()]),
});

const emptySchema = z.object({}).strict();

const roomKickSchema = z.object({
  playerId: z.string(),
});

const screenAttachSchema = z.object({
  roomCode: z.string(),
});

const gameActionSchema = z.object({
  clientActionId: z.string(),
  expectedVersion: z.number().int(),
  action: GameActionSchema,
});

const rematchVoteSchema = z.object({
  value: z.boolean(),
});

export const clientPayloadSchemas = {
  'room:create': roomCreateSchema,
  'room:join': roomJoinSchema,
  'room:resume': roomResumeSchema,
  'room:config': roomConfigSchema,
  'room:start': emptySchema,
  'room:kick': roomKickSchema,
  'room:leave': emptySchema,
  'screen:attach': screenAttachSchema,
  'game:action': gameActionSchema,
  'rematch:vote': rematchVoteSchema,
  ping: emptySchema,
} as const;

export type ClientEventName = keyof typeof clientPayloadSchemas;
