// Mus en el servidor: lo que §12.12 avisaba de que NO era mecánico.
//
// El motor ya estaba (P28). Lo que se prueba aquí es la capa de sala: los
// cuatro jugadores obligatorios (§12.2), las parejas que el anfitrión asigna
// moviendo asientos (decisión 1 de P28), los bots de práctica y las
// estadísticas de §11.2, que hasta ahora contaban `wins` por jugador y en Mus
// tienen que contarlas por pareja.
import { describe, it, expect } from 'vitest';
import { RoomManager } from './room-manager.ts';
import { DEFAULT_MUS_CONFIG } from '@ronda/protocol';
import type { MusState } from '@ronda/engine';

const NOW = 1_000_000;

interface TestRoom {
  code: string;
  ids: Map<string, string>;
}

/** Sala de Mus con `nicks[0]` de anfitrión y el resto unidos, sin empezar. */
function musRoom(m: RoomManager, nicks: string[]): TestRoom {
  const [hostNick, ...guests] = nicks;
  if (!hostNick) throw new Error('musRoom necesita al menos un apodo');
  const created = m.createRoom({
    gameId: 'mus',
    config: DEFAULT_MUS_CONFIG,
    nick: hostNick,
    now: NOW,
  });
  if (!created.ok) throw new Error(`createRoom falló: ${created.code}`);
  const ids = new Map<string, string>([[hostNick, created.value.playerId]]);
  for (const nick of guests) {
    const joined = m.joinRoom({ roomCode: created.value.roomCode, nick, now: NOW });
    if (!joined.ok) throw new Error(`joinRoom falló: ${joined.code}`);
    ids.set(nick, joined.value.playerId);
  }
  return { code: created.value.roomCode, ids };
}

function idOf(r: TestRoom, nick: string): string {
  const id = r.ids.get(nick);
  if (!id) throw new Error(`sin id para ${nick}`);
  return id;
}

function roomOf(m: RoomManager, code: string) {
  const r = m.getRoomByCode(code);
  if (!r) throw new Error(`sala no encontrada: ${code}`);
  return r;
}

function seatOf(m: RoomManager, r: TestRoom, nick: string): number {
  const p = roomOf(m, r.code).players.get(idOf(r, nick));
  if (!p) throw new Error(`sin jugador ${nick}`);
  return p.seat;
}

function musStateOf(m: RoomManager, code: string): MusState {
  const state = roomOf(m, code).state;
  if (!state) throw new Error('sala sin estado');
  if (state.gameId !== 'mus') throw new Error('la sala no es de Mus');
  return state;
}

function statsOf(m: RoomManager, code: string) {
  const res = m.getStats({ roomCode: code });
  if (!res.ok) throw new Error(`getStats falló: ${res.code}`);
  return res.value;
}

/** Los cuatro de siempre, en orden de asiento 0..3. */
const CUATRO = ['Ana', 'Bea', 'Carlos', 'Diego'];

function startedRoom(m: RoomManager): TestRoom {
  const r = musRoom(m, CUATRO);
  const res = m.start({ roomCode: r.code, playerId: idOf(r, 'Ana'), now: NOW });
  if (!res.ok) throw new Error(`start falló: ${res.code}`);
  return r;
}

// ---------------------------------------------------------------------------
// Cuatro jugadores, ni uno más ni uno menos (§12.2)
// ---------------------------------------------------------------------------

describe('Mus: sala de cuatro', () => {
  it('no empieza con tres jugadores', () => {
    const m = new RoomManager();
    const r = musRoom(m, ['Ana', 'Bea', 'Carlos']);
    const res = m.start({ roomCode: r.code, playerId: idOf(r, 'Ana'), now: NOW });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_ENOUGH_PLAYERS');
  });

  it('empieza con cuatro y el motor deriva las parejas del asiento', () => {
    const m = new RoomManager();
    const r = startedRoom(m);
    const state = musStateOf(m, r.code);
    expect(state.players).toHaveLength(4);
    expect(state.players.map((p) => p.teamIndex)).toEqual([0, 1, 0, 1]);
  });

  it('el quinto jugador no cabe: maxPlayers de Mus es 4', () => {
    const m = new RoomManager();
    const r = musRoom(m, CUATRO);
    const res = m.joinRoom({ roomCode: r.code, nick: 'Elena', now: NOW });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('ROOM_FULL');
  });
});

// ---------------------------------------------------------------------------
// Parejas: el anfitrión las asigna moviendo asientos (decisión 1 de P28)
// ---------------------------------------------------------------------------

describe('Mus: parejas por asiento', () => {
  it('el anfitrión intercambia dos asientos y con ello las parejas', () => {
    const m = new RoomManager();
    const r = musRoom(m, CUATRO);
    expect(seatOf(m, r, 'Bea')).toBe(1);
    expect(seatOf(m, r, 'Carlos')).toBe(2);

    const res = m.swapSeats({
      roomCode: r.code,
      playerId: idOf(r, 'Ana'),
      aPlayerId: idOf(r, 'Bea'),
      bPlayerId: idOf(r, 'Carlos'),
      now: NOW,
    });
    expect(res.ok).toBe(true);
    expect(seatOf(m, r, 'Bea')).toBe(2);
    expect(seatOf(m, r, 'Carlos')).toBe(1);

    // Ana (0) y Bea (2) son ahora pareja; Carlos (1) y Diego (3), la otra.
    const start = m.start({ roomCode: r.code, playerId: idOf(r, 'Ana'), now: NOW });
    expect(start.ok).toBe(true);
    const state = musStateOf(m, r.code);
    const teamOf = (nick: string) =>
      state.players.find((p) => p.playerId === idOf(r, nick))?.teamIndex;
    expect(teamOf('Ana')).toBe(teamOf('Bea'));
    expect(teamOf('Carlos')).toBe(teamOf('Diego'));
    expect(teamOf('Ana')).not.toBe(teamOf('Carlos'));
  });

  it('solo el anfitrión mueve asientos', () => {
    const m = new RoomManager();
    const r = musRoom(m, CUATRO);
    const res = m.swapSeats({
      roomCode: r.code,
      playerId: idOf(r, 'Bea'),
      aPlayerId: idOf(r, 'Bea'),
      bPlayerId: idOf(r, 'Carlos'),
      now: NOW,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('NOT_HOST');
  });

  it('no se mueven asientos con la partida empezada', () => {
    const m = new RoomManager();
    const r = startedRoom(m);
    const res = m.swapSeats({
      roomCode: r.code,
      playerId: idOf(r, 'Ana'),
      aPlayerId: idOf(r, 'Bea'),
      bPlayerId: idOf(r, 'Carlos'),
      now: NOW,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('ROOM_ALREADY_STARTED');
  });
});

// ---------------------------------------------------------------------------
// Bots de práctica
// ---------------------------------------------------------------------------

describe('Mus: modo contra la máquina', () => {
  it('permite completar con robots los cuatro asientos y empezar', () => {
    const m = new RoomManager();
    const r = musRoom(m, ['Ana']);
    for (let i = 0; i < 3; i++) {
      const added = m.addBot({ roomCode: r.code, playerId: idOf(r, 'Ana'), now: NOW });
      expect(added.ok).toBe(true);
    }

    const players = roomOf(m, r.code).playersBySeat();
    expect(players).toHaveLength(4);
    expect(players.slice(1).every((player) => player.isBot)).toBe(true);

    const started = m.start({ roomCode: r.code, playerId: idOf(r, 'Ana'), now: NOW });
    expect(started.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Estadísticas por pareja (§11.2 + §12.12)
// ---------------------------------------------------------------------------

describe('Mus: estadísticas de la sala', () => {
  it('apunta la victoria a los dos miembros de la pareja ganadora', () => {
    const m = new RoomManager();
    const r = startedRoom(m);
    const room = roomOf(m, r.code);
    const state = musStateOf(m, r.code);

    // Termina la partida como haría el motor: gana la pareja 1 (asientos 1 y
    // 3), con dos juegos ganados y cinco manos jugadas.
    room.state = {
      ...state,
      status: 'gameEnd',
      winnerTeamIndex: 1,
      juegosWon: [0, 2],
      handNumber: 5,
    };
    room.status = 'gameEnd';
    expect(room.recordMatchEnd()).toBe(true);

    const stats = statsOf(m, r.code);
    expect(stats.matches).toBe(1);
    const rowOf = (nick: string) => stats.rows.find((row) => row.playerId === idOf(r, nick));
    expect(rowOf('Bea')?.wins).toBe(1);
    expect(rowOf('Diego')?.wins).toBe(1);
    expect(rowOf('Ana')?.wins).toBe(0);
    expect(rowOf('Carlos')?.wins).toBe(0);
    // `totalScore` en Mus son los juegos (vacas) de su pareja, y `rounds`
    // las manos jugadas.
    expect(rowOf('Bea')?.totalScore).toBe(2);
    expect(rowOf('Ana')?.totalScore).toBe(0);
    expect(rowOf('Ana')?.rounds).toBe(5);
    expect(rowOf('Ana')?.matches).toBe(1);
  });

  it('un abandono anula la partida: no cuenta en las estadísticas', () => {
    const m = new RoomManager();
    const r = startedRoom(m);

    const res = m.leave({ roomCode: r.code, playerId: idOf(r, 'Diego'), now: NOW });
    expect(res.ok).toBe(true);

    const room = roomOf(m, r.code);
    expect(room.status).toBe('gameEnd');
    // Sin pareja ganadora: con tres no hay Mus y darle la victoria a la
    // pareja entera sería inventarse el resultado (decisión 6 de P28).
    expect(musStateOf(m, r.code).winnerTeamIndex).toBeNull();
    expect(statsOf(m, r.code).matches).toBe(0);
    expect(statsOf(m, r.code).rows).toHaveLength(0);
  });
});
