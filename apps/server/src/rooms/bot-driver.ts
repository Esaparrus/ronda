// Motor de turnos de los jugadores robot (modo "contra la máquina"). Fuera
// del MVP original (00-MASTER.md la lista como "fuera del MVP: IA"), pedido
// explícitamente para poder probar la app en local sin una segunda persona.
//
// Un bot nunca tiene socket: se le programa (setTimeout, para que la jugada
// se note en pantalla como un turno real) y se le mueve llamando al
// RoomManager directamente con su playerId, exactamente como si fuera un
// jugador humano cualquiera. La política de juego es la misma que el
// simulador de P9 (bot-policy.ts): legal y rápida, no necesariamente buena.
import { randomUUID } from 'node:crypto';
import { GAMES } from '@ronda/engine';
import type {
  ChinchonPlayerView,
  ClassicPlayerView,
  MusPlayerView,
  PartyPlayerView,
  PlayerId,
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
  decidePochaAction,
} from './bot-policy.ts';

const BOT_DELAY_MS = 700;

export interface BotDriverDeps {
  io: TypedIoServer;
  mgr: RoomManager;
  now: () => number;
}

/** Turno pendiente de programar para un bot. */
interface BotTurn {
  playerId: PlayerId;
  kind: 'action' | 'nextRound' | 'rematch';
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

  const timer = setTimeout(() => {
    pending.delete(roomCode);
    runBotTurn(deps, roomCode, turn);
  }, BOT_DELAY_MS);
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

  // En los modos sociales los bots pueden responder para facilitar pruebas,
  // pero nunca deciden cuándo abandonar la pantalla de resultados: esa
  // transición pertenece al anfitrión humano.
  if (
    state.gameId === 'orden' ||
    state.gameId === 'colores' ||
    state.gameId === 'mayoria' ||
    state.gameId === 'escala'
  ) {
    if (room.status !== 'playing' || state.status !== 'playing') return null;
    const bots = room.playersBySeat().filter((player) => player.isBot);
    if (state.phase === 'reveal') return null;
    const module = GAMES[room.gameId];
    if (!module) return null;
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
            action === 'submitScale',
        )
      ) {
        return { playerId: bot.playerId, kind: 'action' };
      }
    }
    return null;
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
        view.gameId === 'escala'
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
      const action =
        view.gameId === 'mus'
          ? decideMusAction(view as MusPlayerView)
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
