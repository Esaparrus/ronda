// Bot: cliente Socket.IO automático con política simple. Contrato §5.3 / P9.
//
// Política: si puede cerrar, cierra; si la cima del descarte reduce sus puntos
// sueltos, la roba; si no, roba del mazo; descarta la carta suelta de más puntos.
// Solo tiene que ser LEGAL y RÁPIDO, no bueno jugando.
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import type { CardId, GameAction, PlayerView, Result } from '@ronda/protocol';
import { solveHand, canCloseWith, leakedCards } from '@ronda/engine';
import { decideChinchonAction } from '../rooms/bot-policy.ts';

/** Última acción real enviada por el bot (para el caos de duplicateAction). */
export interface SentAction {
  clientActionId: string;
  expectedVersion: number;
  action: GameAction;
}

export interface BotHandle {
  socket: ClientSocket;
  /** URL del servidor, para poder reconectar (caos de desconexión). */
  url: string;
  playerId?: string;
  playerToken?: string;
  roomCode?: string;
  seat?: number;
  lastView: PlayerView | null;
  /** Versión del `StateViewPayload` que acompañaba a `lastView` (vive fuera de
   * la vista: `CommonView` no lleva `version`, ver contrato §2.4). */
  lastVersion: number;
  /** Si true, el bot aborta (partida terminada o error grave). */
  done: boolean;
  /** Cartas ajenas vistas (violaciones del invariante de seguridad §2.5). */
  violations: string[];
  /** Última acción real (no de caos) enviada; nulo hasta la primera. */
  lastSent: SentAction | null;
  /**
   * Versión para la que el bot ya ha decidido/enviado su acción de turno (o su
   * confirmación de `nextRound`). Sirve para no volver a actuar si llega otra
   * vez la misma versión (p.ej. una difusión de `connection` sin cambios de
   * juego), SIN bloquear la siguiente versión aunque el ack de la anterior
   * todavía no haya llegado: el servidor difunde el `state:view` de una
   * acción (nextTick) potencialmente antes de que el cliente reciba el ack de
   * esa misma acción, así que un bloqueo "en curso" (en vez de por versión)
   * dejaría de jugar el segundo paso del turno (robar → descartar).
   */
  actedForVersion: number | null;
}

/** Crea un bot y lo conecta. `reconnection: false`: el caos gestiona la reconexión a mano. */
export function createBot(url: string): BotHandle {
  const socket = ioc(url, { forceNew: true, reconnection: false });
  return {
    socket,
    url,
    lastView: null,
    lastVersion: 0,
    done: false,
    violations: [],
    lastSent: null,
    actedForVersion: null,
  };
}

/** Genera un clientActionId único (uuid). */
function newActionId(): string {
  return crypto.randomUUID();
}

/**
 * Emite `game:action` y devuelve el ack como promesa. Recuerda la acción como
 * `lastSent` (salvo que sea ella misma una repetición de caos, ver chaos.ts).
 */
export function emitGameAction(
  bot: BotHandle,
  action: GameAction,
  expectedVersion: number,
): Promise<Result<{ version: number }>> {
  const clientActionId = newActionId();
  bot.lastSent = { clientActionId, expectedVersion, action };
  return new Promise((resolve) => {
    bot.socket.emit(
      'game:action',
      { clientActionId, expectedVersion, action },
      (res: Result<{ version: number }>) => resolve(res),
    );
  });
}

/**
 * El bot juega su turno según la política. Devuelve el ack si envió una
 * acción, o `null` si no le tocaba actuar.
 */
export async function botPlay(bot: BotHandle): Promise<Result<{ version: number }> | null> {
  const view = bot.lastView;
  if (!view || view.status !== 'playing') return null;
  // El simulador (P9) es un bot de Chinchón: la política de abajo (robar,
  // cerrar, descartar) es vocabulario de ese juego. PlayerView es una unión
  // discriminada por gameId desde P22 (motor de Pocha) -- este guard
  // estrecha el tipo para el resto de la función, sin cambiar ningún
  // comportamiento (el simulador no crea salas de Pocha).
  if (view.gameId !== 'chinchon') return null;
  const me = view.me;
  if (!me) return null;
  // Solo actúa si es su turno.
  if (view.turnPlayerId !== bot.playerId) return null;

  const action = decideChinchonAction(view);
  if (!action) return null;
  return emitGameAction(bot, action, bot.lastVersion);
}

/**
 * Verifica que la última vista del bot no contenga cartas ajenas (aserto de
 * seguridad §2.5). Devuelve la lista de CardId filtrados (vacía si todo bien)
 * y la acumula en `bot.violations`.
 */
export function checkNoLeak(bot: BotHandle): CardId[] {
  const view = bot.lastView;
  if (!view || view.status !== 'playing' || !view.me) return [];
  if (view.gameId !== 'chinchon') return []; // ver nota de botPlay más arriba
  const allowed = view.discardTop ? [view.discardTop] : [];
  const leaks = leakedCards(view, view.me.hand, allowed);
  if (leaks.length > 0) bot.violations.push(...leaks);
  return leaks;
}

/** Reusa helpers del motor para evitar divergencia. */
export { solveHand, canCloseWith };
