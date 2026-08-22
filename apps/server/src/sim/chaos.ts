// Inyección de caos. Contrato P9.
//
// Con probabilidad `chaos`, en el turno de un bot, en vez de su jugada normal
// (que siempre se intenta DESPUÉS del caos, salvo en la desconexión):
//   - se desconecta 2-5 s y vuelve a entrar con su token (`room:resume`).
//   - envía una acción con `expectedVersion` desfasada (se espera `STALE_VERSION`).
//   - repite el último `clientActionId` ya procesado (se espera idempotencia: `ok`).
//
// El PRNG se inyecta desde fuera (mulberry32 sembrado con `--seed`) para que
// una misma semilla reproduzca siempre el mismo caos.
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import type { Result } from '@ronda/protocol';
import type { BotHandle } from './bot.ts';

export type ChaosKind = 'disconnect' | 'staleVersion' | 'duplicateAction';

/** Generador [0, 1) inyectado (mulberry32 sembrado). */
export type Rand = () => number;

/** Decide si toca inyectar caos y de qué tipo, dada la probabilidad `chaos`. */
export function rollChaos(rand: Rand, chaos: number): ChaosKind | null {
  if (chaos <= 0) return null;
  if (rand() >= chaos) return null;
  const r = rand();
  if (r < 1 / 3) return 'disconnect';
  if (r < 2 / 3) return 'staleVersion';
  return 'duplicateAction';
}

function randomDelayMs(rand: Rand, minMs: number, maxMs: number): number {
  return Math.round(minMs + rand() * (maxMs - minMs));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Desconecta el socket del bot 2-5 s y vuelve a entrar con su token
 * (`room:resume`). Sustituye `bot.socket` por el socket nuevo ya conectado y
 * reengancha los listeners con `rebind` ANTES de emitir `room:resume`, para no
 * perder la difusión que el resume dispara.
 */
export async function chaosDisconnect(
  bot: BotHandle,
  rand: Rand,
  rebind: (bot: BotHandle) => void,
): Promise<Result<{ roomCode: string; playerId: string; seat: number }>> {
  const delayMs = randomDelayMs(rand, 2000, 5000);
  bot.socket.disconnect();
  await sleep(delayMs);

  const socket: ClientSocket = ioc(bot.url, { forceNew: true, reconnection: false });
  await new Promise<void>((resolve) => socket.once('connect', () => resolve()));
  bot.socket = socket;
  rebind(bot);

  const token = bot.playerToken;
  if (!token) {
    return { ok: false, code: 'INVALID_TOKEN', detail: 'bot sin playerToken' };
  }
  return new Promise((resolve) => {
    socket.emit(
      'room:resume',
      { playerToken: token },
      (res: Result<{ roomCode: string; playerId: string; seat: number }>) => resolve(res),
    );
  });
}

/**
 * Envía una acción inofensiva (`sortHand` con el orden actual: no cambia
 * nada) con `expectedVersion` deliberadamente desfasada. El servidor comprueba
 * la versión ANTES de mirar el contenido de la acción, así que siempre
 * responde `STALE_VERSION` sin tocar el estado del motor.
 */
export function chaosStaleVersion(bot: BotHandle): Promise<Result<{ version: number }>> {
  const view = bot.lastView;
  const badVersion = bot.lastVersion + 999;
  const order = view?.kind === 'player' && 'hand' in view.me ? view.me.hand : [];
  const clientActionId = crypto.randomUUID();
  return new Promise((resolve) => {
    bot.socket.emit(
      'game:action',
      { clientActionId, expectedVersion: badVersion, action: { type: 'sortHand', order } },
      (res: Result<{ version: number }>) => resolve(res),
    );
  });
}

/**
 * Repite el último `clientActionId` que el bot procesó con éxito. El
 * servidor debe reconocer la idempotencia y devolver `ok` con la versión ya
 * resultante de la primera vez, SIN volver a aplicar la acción. Devuelve
 * `null` si el bot todavía no ha enviado ninguna acción real (nada que repetir).
 */
export function chaosDuplicateAction(
  bot: BotHandle,
): Promise<Result<{ version: number }>> | null {
  const prev = bot.lastSent;
  if (!prev) return null;
  return new Promise((resolve) => {
    bot.socket.emit(
      'game:action',
      { clientActionId: prev.clientActionId, expectedVersion: prev.expectedVersion, action: prev.action },
      (res: Result<{ version: number }>) => resolve(res),
    );
  });
}
