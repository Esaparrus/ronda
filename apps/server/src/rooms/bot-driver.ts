// Motor de turnos de los jugadores robot (modo "contra la máquina"). Fuera
// del MVP original (00-MASTER.md la lista como "fuera del MVP: IA"), pedido
// explícitamente para poder probar la app en local sin una segunda persona.
//
// Un bot nunca tiene socket: se le programa (setTimeout, para que la jugada
// se note en pantalla como un turno real) y se le mueve llamando al
// RoomManager directamente con su playerId, exactamente como si fuera un
// jugador humano cualquiera. `bot-policy.ts` reparte la decisión a una
// estrategia competitiva específica para cada juego, siempre sobre la vista
// censurada que recibiría un jugador real.
import { randomUUID } from 'node:crypto';
import { GAMES, isRoadmapGame, type RoadmapState } from '@ronda/engine';
import type {
  ChinchonPlayerView,
  ClassicPlayerView,
  MusPlayerView,
  PrecioJustoPlayerView,
  PartyPlayerView,
  PlayerId,
  RoadmapPlayerView,
  RondaPlayerView,
} from '@ronda/protocol';
import type { TypedIoServer } from '../io.ts';
import type { RoomManager } from './room-manager.ts';
import type { EngineState } from './room.ts';
import type { Room } from './room.ts';
import { broadcastRoom } from '../socket/broadcast.ts';
import {
  decideChinchonAction,
  decideClassicAction,
  decideMusAction,
  decidePartyAction,
  decidePrecioJustoAction,
  decidePochaAction,
  decideRondaAction,
  decideRoadmapAction,
} from './bot-policy.ts';

const BOT_DELAY_MS = 700;
const MUSICAL_BOT_DELAY_MS = 5_000;

export interface BotDriverDeps {
  io: TypedIoServer;
  mgr: RoomManager;
  now: () => number;
}

/** Turno pendiente de programar para un bot. */
interface BotTurn {
  playerId: PlayerId;
  kind: 'action' | 'nextRound' | 'showResults' | 'rematch';
}

/** Timers de bot pendientes por sala, para no programar dos veces el mismo turno. */
const pending = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Si le toca mover a un bot en esta sala (turno de juego, confirmar ronda
 * siguiente, o votar revancha), programa su jugada. Idempotente: si ya hay
 * un turno de bot programado para la sala, no hace nada más. Se llama tras
 * cada difusión de estado (mismo punto que dispara `rebroadcast` en
 * handlers.ts), así que cualquier cambio de turno lo recoge solo.
 */
export function scheduleBotTurn(deps: BotDriverDeps, roomCode: string): void {
  if (pending.has(roomCode)) return;
  const room = deps.mgr.getRoomByCode(roomCode);
  if (!room) return;
  const turn = nextBotTurn(room);
  if (!turn) return;

  const delay =
    room.gameId === 'musical'
      ? (room.players.get(turn.playerId)?.botDelayMs ?? MUSICAL_BOT_DELAY_MS)
      : BOT_DELAY_MS;
  const timer = setTimeout(() => {
    pending.delete(roomCode);
    runBotTurn(deps, roomCode, turn);
  }, delay);
  pending.set(roomCode, timer);
}

/**
 * ¿Sigue en pie para confirmar la siguiente ronda? Chinchón elimina a mitad
 * de partida (`eliminated`) además de registrar abandono (`left`); Pocha
 * solo tiene `left` (§9.8: nadie queda eliminado a mitad de partida).
 */
function isEligibleForConfirm(state: EngineState, playerId: PlayerId): boolean {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) return false;
  if ('eliminated' in player && player.eliminated) return false;
  return !player.left;
}

/** ¿Qué bot tiene que actuar ahora mismo, y qué tiene que hacer? null si ninguno. */
function nextBotTurn(room: Room): BotTurn | null {
  const state = room.state;
  if (!state) return null;

  // En los modos sociales los bots pueden responder para facilitar pruebas.
  // En Mayoría, el bot anfitrión también confirma la agrupación automática
  // para que una sala de simulación no se quede bloqueada en la revisión.
  if (
    state.gameId === 'orden' ||
    state.gameId === 'colores' ||
    state.gameId === 'mayoria' ||
    state.gameId === 'escala' ||
    state.gameId === 'matiz'
  ) {
    if (room.status !== 'playing' || state.status !== 'playing') return null;
    const bots = room.playersBySeat().filter((player) => player.isBot);
    const module = GAMES[room.gameId];
    if (!module) return null;
    if (state.phase === 'reveal') {
      const host = bots.find((bot) => bot.seat === 0);
      if (!host) return null;
      const view = module.getPlayerView(state, host.playerId);
      if (view.kind !== 'player') return null;
      const partyView = view as PartyPlayerView;
      if (state.gameId === 'matiz') {
        return partyView.me.availableActions.includes('nextRound')
          ? { playerId: host.playerId, kind: 'nextRound' }
          : null;
      }
      if (state.gameId !== 'mayoria' || state.majority?.groups !== null) return null;
      return partyView.me.availableActions.includes('resolveMajority')
        ? { playerId: host.playerId, kind: 'action' }
        : null;
    }
    for (const bot of bots) {
      const view = module.getPlayerView(state, bot.playerId);
      if (view.kind !== 'player') continue;
      const partyView = view as PartyPlayerView;
      if (
        partyView.me.availableActions.some(
          (action) =>
            action === 'playNumber' ||
            action === 'submitColors' ||
            action === 'submitMajority' ||
            action === 'submitScaleClue' ||
            action === 'submitScale' ||
            action === 'submitMatiz',
        )
      ) {
        return { playerId: bot.playerId, kind: 'action' };
      }
    }
    return null;
  }

  if (room.status === 'playing' && state.gameId === 'preciojusto') {
    const bots = room.playersBySeat().filter((player) => player.isBot);
    const module = GAMES.preciojusto;
    if (!module || state.status !== 'playing') return null;
    const bot = bots.find((candidate) => {
      const view = module.getPlayerView(state, candidate.playerId);
      return (
        view.kind === 'player' &&
        view.me.availableActions.some(
          (action) => action === 'submitPrice' || action === 'finishPrice',
        )
      );
    });
    if (state.phase === 'reveal') {
      const host = bots.find((candidate) => {
        const view = module.getPlayerView(state, candidate.playerId);
        if (view.kind !== 'player') return false;
        return (view as PrecioJustoPlayerView).me.availableActions.includes('nextRound');
      });
      if (host) return { playerId: host.playerId, kind: 'nextRound' };
      const resultsHost = bots.find((candidate) => {
        const view = module.getPlayerView(state, candidate.playerId);
        if (view.kind !== 'player') return false;
        return (view as PrecioJustoPlayerView).me.availableActions.includes('showPriceResults');
      });
      return resultsHost ? { playerId: resultsHost.playerId, kind: 'showResults' } : null;
    }
    return bot ? { playerId: bot.playerId, kind: 'action' } : null;
  }

  // Los juegos del roadmap son respuestas simultáneas y dejan `turnSeat` a
  // null. Buscar bots por las acciones disponibles evita que la IA se quede
  // parada como si la ronda no tuviera turno.
  if (room.status === 'playing' && isRoadmapGame(state.gameId)) {
    const roadmapState = state as RoadmapState;
    const module = GAMES[room.gameId];
    if (!module || roadmapState.status !== 'playing') return null;
    const bots = room.playersBySeat().filter((player) => player.isBot);
    if (roadmapState.phase === 'reveal') {
      const host = bots.find((bot) => bot.seat === 0);
      if (!host) return null;
      const view = module.getPlayerView(roadmapState, host.playerId);
      if (view.kind !== 'player') return null;
      return (view as RoadmapPlayerView).me.availableActions.includes('nextRound')
        ? { playerId: host.playerId, kind: 'nextRound' }
        : null;
    }
    const bot = bots.find((candidate) => {
      const view = module.getPlayerView(roadmapState, candidate.playerId);
      if (view.kind !== 'player') return false;
      return (view as RoadmapPlayerView).me.availableActions.some(
        (action) =>
          action === 'submitFlag' ||
          action === 'submitNumber' ||
          action === 'submitOrder' ||
          action === 'submitWhoVote' ||
          action === 'submitSentence',
      );
    });
    return bot ? { playerId: bot.playerId, kind: 'action' } : null;
  }

  // En la consulta online de Mus actúa una pareja a la vez y `turnSeat` es
  // null a propósito: ambos compañeros pueden responder. Buscamos el primer
  // robot de la pareja activa que todavía tenga una frase o decisión legal.
  if (
    room.status === 'playing' &&
    state.gameId === 'mus' &&
    state.phase === 'mus' &&
    state.config.modo === 'online' &&
    state.musConsultingTeam !== null
  ) {
    const module = GAMES.mus;
    if (!module) return null;
    const activeBot = room.playersBySeat().find((runtime) => {
      if (!runtime.isBot) return false;
      const player = state.players.find((candidate) => candidate.playerId === runtime.playerId);
      if (!player || player.teamIndex !== state.musConsultingTeam) return false;
      const view = module.getPlayerView(state, runtime.playerId);
      if (view.kind !== 'player') return false;
      return view.me.availableActions.some(
        (action) => action === 'musSignal' || action === 'mus' || action === 'noMus',
      );
    });
    return activeBot ? { playerId: activeBot.playerId, kind: 'action' } : null;
  }

  if (room.status === 'playing' && state.gameId === 'musical' && state.phase === 'playing') {
    const bots = room.playersBySeat().filter((player) => player.isBot);
    const module = GAMES.musical;
    if (!module) return null;
    if (state.config.audioMode === 'online') {
      const bot = [...bots]
        .sort(
          (left, right) =>
            (left.botDelayMs ?? MUSICAL_BOT_DELAY_MS) - (right.botDelayMs ?? MUSICAL_BOT_DELAY_MS),
        )
        .find((candidate) => {
          const view = module.getPlayerView(state, candidate.playerId);
          return (
            view.kind === 'player' &&
            view.me.availableActions.some(
              (action) =>
                action === 'musicStartClip' ||
                action === 'musicResolveClip' ||
                action === 'musicSubmitGuess',
            )
          );
        });
      return bot ? { playerId: bot.playerId, kind: 'action' } : null;
    }
    if (state.clipStartedAt === null) return null;
    const buzzedBot =
      state.buzzedPlayerId !== null
        ? bots.find((player) => player.playerId === state.buzzedPlayerId)
        : undefined;
    const bot =
      buzzedBot ??
      [...bots].sort(
        (left, right) =>
          (left.botDelayMs ?? MUSICAL_BOT_DELAY_MS) - (right.botDelayMs ?? MUSICAL_BOT_DELAY_MS),
      )[0];
    if (
      !bot ||
      (state.config.mode === 'velocidad' &&
        state.buzzedPlayerId !== null &&
        state.buzzedPlayerId !== bot.playerId)
    ) {
      return null;
    }
    return { playerId: bot.playerId, kind: 'action' };
  }

  if (room.status === 'playing') {
    const seat = state.turnSeat;
    if (seat === null) return null;
    const player = state.players[seat];
    if (!player) return null;
    const runtime = room.players.get(player.playerId);
    if (!runtime?.isBot) return null;
    return { playerId: player.playerId, kind: 'action' };
  }

  if (room.status === 'roundEnd') {
    // Igual que el simulador (sim/run.ts, isTurnToConfirm): confirma el
    // asiento activo más bajo que todavía no haya votado, uno detrás de
    // otro. Evita que dos bots compitan por la misma `expectedVersion`.
    const votes = state.rematchVotes;
    const next = room
      .playersBySeat()
      .filter((p) => isEligibleForConfirm(state, p.playerId))
      .find((p) => !votes.includes(p.playerId));
    if (!next?.isBot) return null;
    return { playerId: next.playerId, kind: 'nextRound' };
  }

  if (room.status === 'gameEnd') {
    // Aquí no hay carrera de versión (voteRematch no la comprueba): cualquier
    // bot que no haya votado todavía vale, se recorren de uno en uno porque
    // `scheduleBotTurn` se vuelve a llamar tras cada difusión.
    const votes = state.rematchVotes;
    const next = room
      .playersBySeat()
      .find((p) => p.isBot && p.connected && !votes.includes(p.playerId));
    if (!next) return null;
    return { playerId: next.playerId, kind: 'rematch' };
  }

  return null;
}

function runBotTurn(deps: BotDriverDeps, roomCode: string, turn: BotTurn): void {
  try {
    const room = deps.mgr.getRoomByCode(roomCode);
    const state = room?.state;
    if (!room || !state) return;

    if (turn.kind === 'action') {
      const module = GAMES[room.gameId];
      if (!module) return;
      const view = module.getPlayerView(state, turn.playerId);
      if (view.kind !== 'player') return;
      if (
        view.gameId === 'orden' ||
        view.gameId === 'colores' ||
        view.gameId === 'mayoria' ||
        view.gameId === 'escala' ||
        view.gameId === 'matiz'
      ) {
        const action = decidePartyAction(view as PartyPlayerView);
        if (!action) return;
        const r = deps.mgr.applyAction({
          roomCode,
          playerId: turn.playerId,
          clientActionId: randomUUID(),
          expectedVersion: state.version,
          action,
          now: deps.now(),
        });
        if (r.ok) broadcastRoom(deps.io, room);
        return;
      }
      if (isRoadmapGame(view.gameId)) {
        const action = decideRoadmapAction(view as RoadmapPlayerView);
        if (!action) return;
        const r = deps.mgr.applyAction({
          roomCode,
          playerId: turn.playerId,
          clientActionId: randomUUID(),
          expectedVersion: state.version,
          action,
          now: deps.now(),
        });
        if (r.ok) broadcastRoom(deps.io, room);
        return;
      }
      const action =
        view.gameId === 'preciojusto'
          ? decidePrecioJustoAction(view as PrecioJustoPlayerView)
          : view.gameId === 'musical'
            ? state.gameId === 'musical' && state.currentTrack
              ? state.config.audioMode === 'online'
                ? view.me.availableActions.includes('musicStartClip')
                  ? { type: 'musicStartClip' as const }
                  : view.me.availableActions.includes('musicResolveClip')
                    ? { type: 'musicResolveClip' as const }
                    : {
                        type: 'musicSubmitGuess' as const,
                        artist: state.currentTrack.artist,
                        title: state.currentTrack.title,
                        year: state.currentTrack.year,
                      }
                : state.config.mode === 'velocidad' && state.buzzedPlayerId === null
                  ? { type: 'musicBuzz' as const }
                  : {
                      type: 'musicSubmitGuess' as const,
                      artist: state.currentTrack.artist,
                      title: state.currentTrack.title,
                      year: state.currentTrack.year,
                    }
              : null
            : view.gameId === 'mus'
              ? decideMusAction(view as MusPlayerView)
              : view.gameId === 'laronda'
                ? decideRondaAction(view as RondaPlayerView)
                : view.gameId === 'pocha'
                  ? decidePochaAction(view)
                  : view.gameId === 'brisca' ||
                      view.gameId === 'escoba' ||
                      view.gameId === 'sieteymedia' ||
                      view.gameId === 'tute' ||
                      view.gameId === 'cinquillo'
                    ? decideClassicAction(view as ClassicPlayerView)
                    : decideChinchonAction(view as ChinchonPlayerView);
      if (!action) return;
      const r = deps.mgr.applyAction({
        roomCode,
        playerId: turn.playerId,
        clientActionId: randomUUID(),
        expectedVersion: state.version,
        action,
        now: deps.now(),
      });
      if (r.ok) broadcastRoom(deps.io, room);
    } else if (turn.kind === 'nextRound') {
      const r = deps.mgr.applyAction({
        roomCode,
        playerId: turn.playerId,
        clientActionId: randomUUID(),
        expectedVersion: state.version,
        action: { type: 'nextRound' },
        now: deps.now(),
      });
      if (r.ok) broadcastRoom(deps.io, room);
    } else if (turn.kind === 'showResults') {
      const r = deps.mgr.applyAction({
        roomCode,
        playerId: turn.playerId,
        clientActionId: randomUUID(),
        expectedVersion: state.version,
        action: { type: 'showPriceResults' },
        now: deps.now(),
      });
      if (r.ok) broadcastRoom(deps.io, room);
    } else {
      const r = deps.mgr.voteRematch({
        roomCode,
        playerId: turn.playerId,
        value: true,
        now: deps.now(),
      });
      if (r.ok) broadcastRoom(deps.io, room);
    }
  } finally {
    // No dejemos el mapa de timers vacío cuando una vista todavía no tiene una
    // acción, o cuando una acción pierde una carrera de versión. En ambos casos
    // el estado puede seguir esperando al mismo bot y hay que reintentarlo.
    scheduleBotTurn(deps, roomCode);
  }
}
