// Simulador de bots. Contrato P9.
//
//   pnpm sim -- --games=50 --players=4 --seed=1 --chaos=0.1
//
// Levanta el servidor en memoria (Socket.IO real sobre un puerto efímero, con
// un RoomManager SIN hooks de persistencia: nunca toca Postgres, igual que los
// tests de integración de P8), lanza N partidas de Chinchón con bots reales
// (clientes Socket.IO) y reporta: partidas terminadas, turnos medios,
// duración media, errores por código y cualquier partida colgada.
//
// Sale con código de salida distinto de 0 si algo falla (test de humo):
// alguna partida se cuelga, aparece un error inesperado (cualquiera que no
// sea STALE_VERSION/NOT_YOUR_TURN provocado por el propio caos), o se filtra
// información privada de un jugador a otro.
//
// NO se usa en el arranque de producción (ver ../index.ts): es un script
// aparte, pensado para correr desde la terminal o desde CI.
import { createServer } from 'node:http';
import type { Socket as ClientSocket } from 'socket.io-client';
import { createIoServer } from '../io.ts';
import { createLogger, type Logger } from '../logger.ts';
import { loadConfig } from '../config.ts';
import { RoomManager } from '../rooms/room-manager.ts';
import '@ronda/engine';
import { mulberry32, hashSeed } from '@ronda/engine';
import {
  DEFAULT_CONFIG,
  type CommonView,
  type ErrorCode,
  type GameConfig,
  type JoinAck,
  type Result,
  type StateViewPayload,
} from '@ronda/protocol';
import { botPlay, checkNoLeak, createBot, emitGameAction, type BotHandle } from './bot.ts';
import {
  chaosDisconnect,
  chaosDuplicateAction,
  chaosStaleVersion,
  rollChaos,
  type Rand,
} from './chaos.ts';

// --- CLI ---------------------------------------------------------------------

interface CliArgs {
  games: number;
  players: number;
  seed: string;
  chaos: number;
  /**
   * Pausa mínima antes de cada emisión. Contrato §6: máximo 20 mensajes / 10 s
   * por socket. Como el juego es por turnos (un solo bot activo a la vez), el
   * ritmo de mensajes de UN bot concreto quede diluido por el número de
   * jugadores (con N jugadores, a un bot le toca ~1/N de los turnos). Para que
   * ningún socket supere el límite incluso con `--players=2` (el peor caso),
   * basta con `delayMs >= 500 / N`; con `N=2` eso es 250 ms. Se deja margen.
   */
  actionDelayMs: number;
  /** Tope de acciones por partida: si se supera, la partida se marca colgada. */
  maxActions: number;
  /** Si no llega ningún state:view en este tiempo, la partida se da por colgada. */
  watchdogMs: number;
}

function parseArgs(argv: string[]): CliArgs {
  const raw: Record<string, string> = {};
  for (const arg of argv) {
    const m = /^--([a-zA-Z-]+)=(.*)$/.exec(arg);
    const key = m?.[1];
    const value = m?.[2];
    if (key !== undefined && value !== undefined) raw[key] = value;
  }
  const players = clampInt(Number(raw.players ?? 4), 2, 4);
  return {
    games: Math.max(1, Math.round(Number(raw.games ?? 50))),
    players,
    seed: raw.seed ?? '1',
    chaos: clamp(Number(raw.chaos ?? 0.1), 0, 1),
    actionDelayMs: Math.max(0, Math.round(Number(raw['action-delay-ms'] ?? 300))),
    maxActions: Math.max(10, Math.round(Number(raw['max-actions'] ?? 4000))),
    watchdogMs: Math.max(1000, Math.round(Number(raw['watchdog-ms'] ?? 8000))),
  };
}

function clamp(n: number, lo: number, hi: number): number {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function clampInt(n: number, lo: number, hi: number): number {
  return Math.round(clamp(n, lo, hi));
}

function sleepMs(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitConnect(socket: ClientSocket): Promise<void> {
  return new Promise((resolve) => socket.once('connect', () => resolve()));
}

// --- estadísticas de una partida ----------------------------------------------

interface GameStats {
  index: number;
  completed: boolean;
  hung: boolean;
  actions: number;
  rounds: number;
  durationMs: number;
  winnerId: string | null;
  winnerSeat: number | null;
  chaosErrors: Partial<Record<ErrorCode, number>>;
  benignErrors: Partial<Record<ErrorCode, number>>;
  unexpectedErrors: Partial<Record<ErrorCode, number>>;
  leakViolations: string[];
}

/** ¿Le toca a este jugador confirmar `nextRound`? Sirve el asiento activo más
 * bajo que todavía no haya confirmado: serializa las confirmaciones y evita
 * que varios bots compitan por la misma versión a la vez. */
function isTurnToConfirm(view: CommonView, playerId: string | undefined): boolean {
  if (!playerId) return false;
  if (view.rematchVotes.includes(playerId)) return false;
  const next = view.players
    .filter((p) => !p.eliminated)
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .find((p) => !view.rematchVotes.includes(p.playerId));
  return next?.playerId === playerId;
}

interface RunOneGameOpts {
  index: number;
  url: string;
  players: number;
  seed: string;
  chaos: number;
  actionDelayMs: number;
  maxActions: number;
  watchdogMs: number;
  config: GameConfig;
}

async function runOneGame(opts: RunOneGameOpts): Promise<GameStats> {
  const rand: Rand = mulberry32(hashSeed(`${opts.seed}:${opts.index}`));
  const stats: GameStats = {
    index: opts.index,
    completed: false,
    hung: false,
    actions: 0,
    rounds: 1,
    durationMs: 0,
    winnerId: null,
    winnerSeat: null,
    chaosErrors: {},
    benignErrors: {},
    unexpectedErrors: {},
    leakViolations: [],
  };

  const started = Date.now();
  const bots: BotHandle[] = Array.from({ length: opts.players }, () => createBot(opts.url));
  await Promise.all(bots.map((b) => waitConnect(b.socket)));

  let settled = false;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let resolveDone: (() => void) | null = null;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  function settle(hung: boolean): void {
    if (settled) return;
    settled = true;
    stats.hung = hung;
    if (watchdog) clearTimeout(watchdog);
    for (const b of bots) b.done = true;
    resolveDone?.();
  }

  function bumpWatchdog(): void {
    if (watchdog) clearTimeout(watchdog);
    watchdog = setTimeout(() => settle(true), opts.watchdogMs);
  }

  function record(res: Result<unknown>, tag: 'chaos' | 'normal'): void {
    stats.actions++;
    if (res.ok) return;
    if (tag === 'chaos') {
      stats.chaosErrors[res.code] = (stats.chaosErrors[res.code] ?? 0) + 1;
      return;
    }
    if (res.code === 'STALE_VERSION' || res.code === 'NOT_YOUR_TURN') {
      stats.benignErrors[res.code] = (stats.benignErrors[res.code] ?? 0) + 1;
      return;
    }
    stats.unexpectedErrors[res.code] = (stats.unexpectedErrors[res.code] ?? 0) + 1;
  }

  function attach(bot: BotHandle): void {
    bot.socket.on('state:view', (payload: StateViewPayload) => {
      void onView(bot, payload);
    });
  }

  async function onView(bot: BotHandle, payload: StateViewPayload): Promise<void> {
    if (settled) return;
    const view = payload.view;
    if (view.kind !== 'player') return;
    bot.lastView = view;
    bot.lastVersion = payload.version;
    bumpWatchdog();

    const leaks = checkNoLeak(bot);
    if (leaks.length > 0) stats.leakViolations.push(...leaks);

    if (stats.actions >= opts.maxActions) {
      settle(true);
      return;
    }

    if (view.status === 'gameEnd') {
      stats.completed = true;
      stats.winnerId = view.winnerId;
      const winner = view.players.find((p) => p.playerId === view.winnerId);
      stats.winnerSeat = winner?.seat ?? null;
      stats.rounds = view.round;
      settle(false);
      return;
    }

    if (view.status === 'roundEnd') {
      stats.rounds = view.round;
      if (bot.actedForVersion !== payload.version && isTurnToConfirm(view, bot.playerId)) {
        bot.actedForVersion = payload.version;
        await sleepMs(opts.actionDelayMs);
        if (settled) return;
        record(await emitGameAction(bot, { type: 'nextRound' }, bot.lastVersion), 'normal');
      }
      return;
    }

    if (view.status !== 'playing') return;
    if (view.turnPlayerId !== bot.playerId) return;
    // Se marca por VERSIÓN, no con un candado "en curso": el servidor difunde
    // el state:view de una acción (nextTick) potencialmente antes de que el
    // propio cliente reciba el ack de esa acción. Un candado en curso dejaría
    // sin jugar el segundo paso del turno (robar → descartar), porque la
    // difusión de "ya robé, ahora toca descartar" llegaría mientras seguimos
    // esperando el ack de "robar" y quedaría descartada por el candado.
    if (bot.actedForVersion === payload.version) return;
    bot.actedForVersion = payload.version;

    const kind = rollChaos(rand, opts.chaos);
    if (kind === 'disconnect') {
      record(await chaosDisconnect(bot, rand, attach), 'chaos');
      // El resume reemite el mismo estado (nada cambió mientras el bot
      // estaba pausado): hay que poder reaccionar a esa MISMA versión.
      bot.actedForVersion = null;
      return;
    }
    if (kind === 'staleVersion') {
      await sleepMs(opts.actionDelayMs);
      if (settled) return;
      record(await chaosStaleVersion(bot), 'chaos');
    } else if (kind === 'duplicateAction') {
      const pending = chaosDuplicateAction(bot);
      if (pending) {
        await sleepMs(opts.actionDelayMs);
        if (settled) return;
        record(await pending, 'chaos');
      }
    }
    await sleepMs(opts.actionDelayMs);
    if (settled) return;
    const res = await botPlay(bot);
    if (res) record(res, 'normal');
  }

  for (const bot of bots) attach(bot);
  bumpWatchdog();

  const host = bots[0];
  if (!host) throw new Error('runOneGame: se requiere al menos 1 jugador');

  const createRes = await new Promise<Result<JoinAck>>((resolve) => {
    host.socket.emit(
      'room:create',
      { gameId: 'chinchon', config: opts.config, nick: 'Bot1' },
      (res: Result<JoinAck>) => resolve(res),
    );
  });
  if (!createRes.ok) throw new Error(`room:create falló: ${createRes.code}`);
  host.playerId = createRes.value.playerId;
  host.playerToken = createRes.value.playerToken;
  host.roomCode = createRes.value.roomCode;
  host.seat = createRes.value.seat;

  for (let i = 1; i < bots.length; i++) {
    const bot = bots[i];
    if (!bot) continue;
    const joinRes = await new Promise<Result<JoinAck>>((resolve) => {
      bot.socket.emit(
        'room:join',
        { roomCode: host.roomCode ?? '', nick: `Bot${i + 1}` },
        (res: Result<JoinAck>) => resolve(res),
      );
    });
    if (!joinRes.ok) throw new Error(`room:join falló: ${joinRes.code}`);
    bot.playerId = joinRes.value.playerId;
    bot.playerToken = joinRes.value.playerToken;
    bot.roomCode = joinRes.value.roomCode;
    bot.seat = joinRes.value.seat;
  }

  const startRes = await new Promise<Result<null>>((resolve) => {
    host.socket.emit('room:start', {}, (res: Result<null>) => resolve(res));
  });
  if (!startRes.ok) throw new Error(`room:start falló: ${startRes.code}`);

  await done;
  stats.durationMs = Date.now() - started;

  for (const bot of bots) bot.socket.disconnect();
  return stats;
}

// --- informe agregado ----------------------------------------------------------

interface Report {
  ok: boolean;
  gamesRequested: number;
  gamesCompleted: number;
  gamesHung: number;
  avgActions: number;
  avgDurationMs: number;
  avgRounds: number;
  chaosErrors: Partial<Record<ErrorCode, number>>;
  benignErrors: Partial<Record<ErrorCode, number>>;
  unexpectedErrors: Partial<Record<ErrorCode, number>>;
  leakViolations: number;
  winsBySeat: Partial<Record<number, number>>;
  hungIndexes: number[];
}

function mergeCounts(
  into: Partial<Record<ErrorCode, number>>,
  from: Partial<Record<ErrorCode, number>>,
): void {
  for (const [k, v] of Object.entries(from)) {
    const code = k as ErrorCode;
    into[code] = (into[code] ?? 0) + (v ?? 0);
  }
}

function buildReport(results: GameStats[]): Report {
  const n = results.length || 1;
  const sum = (f: (s: GameStats) => number): number => results.reduce((acc, s) => acc + f(s), 0);

  const chaosErrors: Partial<Record<ErrorCode, number>> = {};
  const benignErrors: Partial<Record<ErrorCode, number>> = {};
  const unexpectedErrors: Partial<Record<ErrorCode, number>> = {};
  const winsBySeat: Partial<Record<number, number>> = {};
  let leakViolations = 0;

  for (const r of results) {
    mergeCounts(chaosErrors, r.chaosErrors);
    mergeCounts(benignErrors, r.benignErrors);
    mergeCounts(unexpectedErrors, r.unexpectedErrors);
    leakViolations += r.leakViolations.length;
    if (r.winnerSeat !== null) winsBySeat[r.winnerSeat] = (winsBySeat[r.winnerSeat] ?? 0) + 1;
  }

  const gamesCompleted = results.filter((r) => r.completed).length;
  const gamesHung = results.filter((r) => r.hung).length;
  const ok =
    gamesHung === 0 &&
    gamesCompleted === results.length &&
    Object.keys(unexpectedErrors).length === 0 &&
    leakViolations === 0;

  return {
    ok,
    gamesRequested: results.length,
    gamesCompleted,
    gamesHung,
    avgActions: sum((s) => s.actions) / n,
    avgDurationMs: sum((s) => s.durationMs) / n,
    avgRounds: sum((s) => s.rounds) / n,
    chaosErrors,
    benignErrors,
    unexpectedErrors,
    leakViolations,
    winsBySeat,
    hungIndexes: results.filter((r) => r.hung).map((r) => r.index),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function printReport(logger: Logger, report: Report): void {
  logger.info('sim: informe final', {
    gamesRequested: report.gamesRequested,
    gamesCompleted: report.gamesCompleted,
    gamesHung: report.gamesHung,
    avgActions: round2(report.avgActions),
    avgRounds: round2(report.avgRounds),
    avgDurationMs: round2(report.avgDurationMs),
    winsBySeat: report.winsBySeat,
    chaosErrors: report.chaosErrors,
    benignErrors: report.benignErrors,
    unexpectedErrors: report.unexpectedErrors,
    leakViolations: report.leakViolations,
    hungIndexes: report.hungIndexes,
    ok: report.ok,
  });
}

// --- arranque ------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  // DATABASE_URL es obligatoria para loadConfig, pero el RoomManager de este
  // script se crea SIN hooks de persistencia (ver más abajo): nunca se abre
  // conexión real a Postgres. El valor es un relleno inofensivo.
  const cfg = loadConfig({ DATABASE_URL: 'postgres://sim-en-memoria/no-op', NODE_ENV: 'development' });
  const logger = createLogger(cfg, { service: 'ronda-sim' });

  const httpServer = createServer();
  const mgr = new RoomManager(); // sin hooks: 100% en memoria, como en los tests de P8.
  const { io, stopPeriodic } = createIoServer({ server: httpServer, config: cfg, logger, manager: mgr });

  const port = await new Promise<number>((resolve) => {
    httpServer.listen(0, () => {
      const addr = httpServer.address();
      resolve(typeof addr === 'object' && addr ? addr.port : 0);
    });
  });
  const url = `http://localhost:${port}`;

  logger.info('sim: arrancando', {
    games: args.games,
    players: args.players,
    seed: args.seed,
    chaos: args.chaos,
    actionDelayMs: args.actionDelayMs,
  });

  const config: GameConfig = { ...DEFAULT_CONFIG, maxPlayers: args.players as 2 | 3 | 4 };
  const results: GameStats[] = [];

  for (let i = 0; i < args.games; i++) {
    const stats = await runOneGame({
      index: i,
      url,
      players: args.players,
      seed: args.seed,
      chaos: args.chaos,
      actionDelayMs: args.actionDelayMs,
      maxActions: args.maxActions,
      watchdogMs: args.watchdogMs,
      config,
    });
    results.push(stats);
    logger.info('sim: partida terminada', {
      index: i,
      completed: stats.completed,
      hung: stats.hung,
      rounds: stats.rounds,
      actions: stats.actions,
      durationMs: stats.durationMs,
      winnerSeat: stats.winnerSeat,
    });
  }

  stopPeriodic?.();
  io.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));

  const report = buildReport(results);
  printReport(logger, report);

  process.exitCode = report.ok ? 0 : 1;
}

main().catch((e: unknown) => {
  // eslint-disable-next-line no-console -- fallo crítico del propio simulador
  console.error('sim: fallo crítico:', e);
  process.exitCode = 1;
});
