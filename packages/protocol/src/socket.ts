// Eventos de Socket.IO (cliente↔servidor) y esquemas zod de los payloads de
// entrada (los que el servidor valida ANTES de tocar nada). Contrato §2.3, §2.4.
import { z } from 'zod';
import { GameActionSchema } from './actions.ts';
import {
  ChinchonConfigSchema,
  BriscaConfigSchema,
  CinquilloConfigSchema,
  ColoresConfigSchema,
  EscobaConfigSchema,
  EscalaConfigSchema,
  GameConfigSchema,
  LaRondaConfigSchema,
  MayoriaConfigSchema,
  MusConfigSchema,
  MusicalConfigSchema,
  OrdenConfigSchema,
  PochaConfigSchema,
  PrecioJustoConfigSchema,
  BanderasConfigSchema,
  CifrasConfigSchema,
  QuienLoHariaConfigSchema,
  CompletaLaFraseConfigSchema,
  SieteYMediaConfigSchema,
  TuteConfigSchema,
} from './config.ts';
import type { GameEvent } from './events.ts';
import type { GameId, PlayerId, RoomCode } from './ids.ts';
import type { PlayerView, TableView } from './views.ts';
import type { GameConfig } from './config.ts';
import type { Result } from './result.ts';
import { ReactionIdSchema, type ReactionId, type ReactionPayload } from './reactions.ts';
import type { RoomStats } from './stats.ts';

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

/**
 * Informe acotado de diagnóstico enviado por un cliente. Deliberadamente no
 * admite objetos arbitrarios ni texto largo: así un registrador del navegador
 * no puede acabar enviando tokens, respuestas libres o snapshots privados por
 * accidente.
 */
const diagnosticScalarSchema = z.union([
  z.string().max(200),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const forbiddenDiagnosticKeys = new Set([
  'token',
  'playerToken',
  'nick',
  'answer',
  'text',
  'prompt',
  'question',
  'hand',
]);

export const DiagnosticEntrySchema = z
  .object({
    at: z.number().int().nonnegative(),
    kind: z.string().min(1).max(40),
    data: z
      .record(z.union([diagnosticScalarSchema, z.array(diagnosticScalarSchema).max(20)]))
      .refine((data) => Object.keys(data).every((key) => !forbiddenDiagnosticKeys.has(key)), {
        message: 'diagnostic data contains a private field',
      }),
  })
  .strict();

export const DiagnosticContextSchema = z
  .object({
    roomCode: z.string().max(12).nullable(),
    playerId: z.string().max(80).nullable(),
    gameId: z.string().max(40).nullable(),
    viewKind: z.enum(['player', 'table']).nullable(),
    status: z.string().max(40).nullable(),
    phase: z.string().max(40).nullable(),
    version: z.number().int().nonnegative(),
    connection: z.enum(['online', 'reconnecting', 'offline']),
    pendingAction: z.boolean(),
    pendingSince: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const DiagnosticReportSchema = z
  .object({
    incidentId: z.string().regex(/^RND-[A-Z0-9]{8}$/),
    reason: z.enum(['manual_block', 'client_error', 'unhandled_rejection', 'state_sync_timeout']),
    occurredAt: z.number().int().nonnegative(),
    path: z.string().max(240),
    release: z.string().max(120).nullable(),
    userAgent: z.string().max(500),
    context: DiagnosticContextSchema,
    entries: z.array(DiagnosticEntrySchema).max(50),
    error: z
      .object({
        name: z.string().max(100),
        message: z.string().max(500),
        stack: z.string().max(4_000).nullable(),
      })
      .strict()
      .nullable(),
  })
  .strict();

export type DiagnosticEntry = z.infer<typeof DiagnosticEntrySchema>;
export type DiagnosticContext = z.infer<typeof DiagnosticContextSchema>;
export type DiagnosticReport = z.infer<typeof DiagnosticReportSchema>;

export interface DiagnosticAck {
  incidentId: string;
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
  /**
   * Añade un jugador robot a la sala (modo "contra la máquina", fuera del
   * MVP original pero pedido explícitamente para poder probar sin una
   * segunda persona). Solo el anfitrión, solo en lobby, solo con hueco.
   */
  'room:addBot': (payload: { delayMs?: number }, ack: (res: Result<JoinAck>) => void) => void;
  /**
   * Intercambia el asiento de dos jugadores. Solo el anfitrión y solo en
   * lobby. Existe por Mus: es un juego POR PAREJAS y la decisión 1 de P28
   * dice que las asigna «el anfitrión moviendo asientos» y el motor las
   * deriva de `seat % 2` (§12.2). Sin esto, la pareja la decidiría el orden
   * de llegada a la sala, que no es una decisión de nadie.
   *
   * No es exclusivo de Mus -- reordenar la mesa también cambia el orden de
   * turno en Chinchón y en Pocha -- pero es Mus quien lo hace necesario.
   */
  'room:swapSeats': (
    payload: { aPlayerId: PlayerId; bPlayerId: PlayerId },
    ack: (res: Result<null>) => void,
  ) => void;
  /** Solo anfitrión y solo en el lobby de Escala por grupos. */
  'room:setGroup': (
    payload: { targetPlayerId: PlayerId; groupIndex: number },
    ack: (res: Result<null>) => void,
  ) => void;
  'room:kick': (payload: { playerId: PlayerId }, ack: (res: Result<null>) => void) => void;
  'room:leave': (payload: Record<string, never>, ack: (res: Result<null>) => void) => void;
  /** Solo el anfitrión: cierra la sala para todos (contrato §2.4 `room:closed`, razón `host_left`). */
  'room:close': (payload: Record<string, never>, ack: (res: Result<null>) => void) => void;
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
  /**
   * Reacción rápida (roadmap "Después del MVP" §2). Cualquier jugador de la
   * sala, en cualquier estado, con enfriamiento propio por jugador
   * (`REACTION_COOLDOWN_MS`): al superarlo, el ack responde `RATE_LIMITED`.
   * No es una `GameAction` -- no toca el motor ni consume versión.
   */
  'reaction:send': (payload: { reaction: ReactionId }, ack: (res: Result<null>) => void) => void;
  /**
   * Estadísticas acumuladas de la sala (roadmap "Después del MVP" §3). A
   * demanda, no en cada snapshot: ver la nota de `stats.ts`. Solo lectura y
   * solo datos públicos, así que también la puede pedir una pantalla central.
   */
  'room:stats': (payload: Record<string, never>, ack: (res: Result<RoomStats>) => void) => void;
  /** Registra un fallo de interfaz o bloqueo lógico sin incluir secretos del cliente. */
  'diagnostic:report': (
    payload: DiagnosticReport,
    ack: (res: Result<DiagnosticAck>) => void,
  ) => void;
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
  /** Reacción de un jugador, difundida a todos los miembros (incluida la pantalla central). */
  reaction: (payload: ReactionPayload) => void;
}

// --- esquemas zod de los payloads de entrada (validación en el servidor) ----
//
// Clave = nombre del evento. Solo figuran los eventos que el cliente envía.
// El servidor hace: schemas[eventName]?.parse(payload) antes de tocar nada.

const roomCreateSchema = z.object({
  // Contrato §10.1 (P21/P22) y §12.12 (P27/P28): GameId es
  // 'chinchon' | 'pocha' | 'mus' | modos sociales. Todos están cableados de
  // punta a punta
  // (motor, servidor e interfaz); `room-manager.ts` sigue siendo quien
  // rechaza con GAME_NOT_FOUND cualquier gameId sin módulo registrado.
  gameId: z.union([
    z.literal('chinchon'),
    z.literal('pocha'),
    z.literal('mus'),
    z.literal('brisca'),
    z.literal('escoba'),
    z.literal('sieteymedia'),
    z.literal('tute'),
    z.literal('cinquillo'),
    z.literal('orden'),
    z.literal('colores'),
    z.literal('mayoria'),
    z.literal('escala'),
    z.literal('laronda'),
    z.literal('musical'),
    z.literal('preciojusto'),
    z.literal('banderas'),
    z.literal('cifras'),
    z.literal('quienloharia'),
    z.literal('completalafrase'),
  ]),
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
  patch: z.union([
    ChinchonConfigSchema.partial(),
    PochaConfigSchema.partial(),
    MusConfigSchema.partial(),
    BriscaConfigSchema.partial(),
    EscobaConfigSchema.partial(),
    SieteYMediaConfigSchema.partial(),
    TuteConfigSchema.partial(),
    CinquilloConfigSchema.partial(),
    OrdenConfigSchema.partial(),
    ColoresConfigSchema.partial(),
    MayoriaConfigSchema.partial(),
    EscalaConfigSchema.partial(),
    LaRondaConfigSchema.partial(),
    MusicalConfigSchema.partial(),
    PrecioJustoConfigSchema.partial(),
    BanderasConfigSchema.partial(),
    CifrasConfigSchema.partial(),
    QuienLoHariaConfigSchema.partial(),
    CompletaLaFraseConfigSchema.partial(),
  ]),
});

const emptySchema = z.object({}).strict();

const addBotSchema = z
  .object({
    /** Retraso configurable para practicar las carreras de Musical. */
    delayMs: z.number().int().min(500).max(15_000).optional(),
  })
  .strict();

const roomKickSchema = z.object({
  playerId: z.string(),
});

const roomSwapSeatsSchema = z.object({
  aPlayerId: z.string(),
  bPlayerId: z.string(),
});

const roomSetGroupSchema = z.object({
  targetPlayerId: z.string(),
  groupIndex: z.number().int().min(0).max(3),
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

// Lista cerrada de 4 identificadores (reactions.ts): cualquier otra cosa la
// rechaza el guard del servidor con INVALID_ACTION antes de tocar la sala.
const reactionSendSchema = z.object({
  reaction: ReactionIdSchema,
});

export const clientPayloadSchemas = {
  'room:create': roomCreateSchema,
  'room:join': roomJoinSchema,
  'room:resume': roomResumeSchema,
  'room:config': roomConfigSchema,
  'room:start': emptySchema,
  'room:addBot': addBotSchema,
  'room:swapSeats': roomSwapSeatsSchema,
  'room:setGroup': roomSetGroupSchema,
  'room:kick': roomKickSchema,
  'room:leave': emptySchema,
  'room:close': emptySchema,
  'screen:attach': screenAttachSchema,
  'game:action': gameActionSchema,
  'rematch:vote': rematchVoteSchema,
  'reaction:send': reactionSendSchema,
  'room:stats': emptySchema,
  'diagnostic:report': DiagnosticReportSchema,
  ping: emptySchema,
} as const;

export type ClientEventName = keyof typeof clientPayloadSchemas;
