// Reacciones rápidas y estadísticas por sala. Roadmap "Después del MVP"
// §2 y §3 de 02-PAQUETES.md.
import { describe, it, expect } from 'vitest';
import { RoomManager } from './room-manager.ts';
import { DEFAULT_CONFIG, DEFAULT_POCHA_CONFIG, REACTION_COOLDOWN_MS } from '@ronda/protocol';

const NOW = 1_000_000;

interface TestRoom {
  code: string;
  /** playerId por apodo. Se lee con `idOf` (nada de `!` -- lo prohíbe ESLint). */
  ids: Map<string, string>;
}

/** Sala con `nicks[0]` de anfitrión y el resto unidos. */
function roomWith(
  m: RoomManager,
  nicks: string[],
  gameId: 'chinchon' | 'pocha' = 'chinchon',
): TestRoom {
  const [hostNick, ...guests] = nicks;
  if (!hostNick) throw new Error('roomWith necesita al menos un apodo');
  const config = gameId === 'pocha' ? DEFAULT_POCHA_CONFIG : DEFAULT_CONFIG;
  const created = m.createRoom({ gameId, config, nick: hostNick, now: NOW });
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

function statsOf(m: RoomManager, code: string) {
  const res = m.getStats({ roomCode: code });
  if (!res.ok) throw new Error(`getStats falló: ${res.code}`);
  return res.value;
}

/**
 * Termina la partida en curso con las puntuaciones dadas (por asiento) y el
 * ganador indicado, como haría el motor al llegar a 'gameEnd'.
 */
function endMatch(
  m: RoomManager,
  code: string,
  scoresBySeat: number[],
  winnerSeat: number,
  round = 3,
): void {
  const r = roomOf(m, code);
  const state = r.state;
  if (!state) throw new Error('sala sin estado');
  // Estas salas son de Chinchón o de Pocha: las de Mus puntúan por pareja y
  // ni sus jugadores tienen `score` ni su estado tiene `winnerId` (§12.12),
  // así que se descartan aquí en vez de castear.
  if (state.gameId === 'mus') throw new Error('endMatch no vale para Mus');
  state.players.forEach((p, i) => {
    p.score = scoresBySeat[i] ?? 0;
  });
  const winner = state.players[winnerSeat];
  if (!winner) throw new Error('asiento ganador inválido');
  r.state = { ...state, status: 'gameEnd', winnerId: winner.playerId, round };
  r.status = 'gameEnd';
}

/** Empieza la partida de una sala recién creada (el anfitrión es `hostNick`). */
function start(m: RoomManager, r: TestRoom, hostNick: string): void {
  const res = m.start({ roomCode: r.code, playerId: idOf(r, hostNick), now: NOW });
  if (!res.ok) throw new Error(`start falló: ${res.code}`);
}

// ---------------------------------------------------------------------------
// Reacciones rápidas
// ---------------------------------------------------------------------------

describe('reacciones rápidas', () => {
  it('un jugador de la sala puede reaccionar y el payload lleva su asiento', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    const res = m.sendReaction({
      roomCode: r.code,
      playerId: idOf(r, 'Beto'),
      reaction: 'aplauso',
      now: NOW,
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.value).toMatchObject({
      playerId: idOf(r, 'Beto'),
      seat: 1,
      reaction: 'aplauso',
      at: NOW,
    });
  });

  it('funciona ya en el lobby, sin partida empezada', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    expect(roomOf(m, r.code).status).toBe('lobby');
    const res = m.sendReaction({
      roomCode: r.code,
      playerId: idOf(r, 'Ana'),
      reaction: 'risa',
      now: NOW,
    });
    expect(res.ok).toBe(true);
  });

  it('aplica enfriamiento por jugador y lo levanta al cumplirse', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    const ana = idOf(r, 'Ana');
    expect(m.sendReaction({ roomCode: r.code, playerId: ana, reaction: 'risa', now: NOW }).ok).toBe(
      true,
    );

    const tooSoon = m.sendReaction({
      roomCode: r.code,
      playerId: ana,
      reaction: 'risa',
      now: NOW + REACTION_COOLDOWN_MS - 1,
    });
    expect(tooSoon.ok).toBe(false);
    if (!tooSoon.ok) expect(tooSoon.code).toBe('RATE_LIMITED');

    // El enfriamiento es por jugador: a Beto no le afecta el de Ana.
    const beto = m.sendReaction({
      roomCode: r.code,
      playerId: idOf(r, 'Beto'),
      reaction: 'risa',
      now: NOW + 1,
    });
    expect(beto.ok).toBe(true);

    const later = m.sendReaction({
      roomCode: r.code,
      playerId: ana,
      reaction: 'risa',
      now: NOW + REACTION_COOLDOWN_MS,
    });
    expect(later.ok).toBe(true);
  });

  it('rechaza a quien no está en la sala y a las salas que no existen', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    const fuera = m.sendReaction({
      roomCode: r.code,
      playerId: 'no-soy-de-aqui',
      reaction: 'pensar',
      now: NOW,
    });
    expect(fuera.ok).toBe(false);
    if (!fuera.ok) expect(fuera.code).toBe('PLAYER_NOT_IN_ROOM');

    const sinSala = m.sendReaction({
      roomCode: 'ZZZZ',
      playerId: 'x',
      reaction: 'pensar',
      now: NOW,
    });
    expect(sinSala.ok).toBe(false);
    if (!sinSala.ok) expect(sinSala.code).toBe('ROOM_NOT_FOUND');
  });

  it('reaccionar no libra a la sala de caducar por inactividad', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    const before = roomOf(m, r.code).lastActivityAt;
    m.sendReaction({
      roomCode: r.code,
      playerId: idOf(r, 'Ana'),
      reaction: 'risa',
      now: NOW + 60_000,
    });
    expect(roomOf(m, r.code).lastActivityAt).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Estadísticas por sala
// ---------------------------------------------------------------------------

describe('estadísticas por sala', () => {
  it('una sala recién creada no tiene estadísticas', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    expect(statsOf(m, r.code)).toMatchObject({
      roomCode: r.code,
      gameId: 'chinchon',
      matches: 0,
      rows: [],
    });
  });

  it('anota una partida terminada: victorias, rondas y puntuaciones', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    start(m, r, 'Ana');
    endMatch(m, r.code, [12, 105], 0, 4);
    expect(roomOf(m, r.code).recordMatchEnd()).toBe(true);

    const stats = statsOf(m, r.code);
    expect(stats.matches).toBe(1);
    expect(stats.rows[0]).toMatchObject({
      nick: 'Ana',
      matches: 1,
      wins: 1,
      rounds: 4,
      totalScore: 12,
      bestScore: 12,
      worstScore: 12,
    });
    expect(stats.rows[1]).toMatchObject({ nick: 'Beto', wins: 0, totalScore: 105 });
  });

  it('no cuenta dos veces la misma partida', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    start(m, r, 'Ana');
    endMatch(m, r.code, [12, 105], 0);
    expect(roomOf(m, r.code).recordMatchEnd()).toBe(true);
    expect(roomOf(m, r.code).recordMatchEnd()).toBe(false);

    const stats = statsOf(m, r.code);
    expect(stats.matches).toBe(1);
    expect(stats.rows[0]?.matches).toBe(1);
  });

  it('acumula entre partidas sucesivas de la misma sala (revancha)', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    start(m, r, 'Ana');
    endMatch(m, r.code, [20, 110], 0, 3);
    roomOf(m, r.code).recordMatchEnd();

    // Revancha: mismos asientos, semilla nueva, marcador a cero.
    for (const nick of ['Ana', 'Beto']) {
      m.voteRematch({ roomCode: r.code, playerId: idOf(r, nick), value: true, now: NOW });
    }
    endMatch(m, r.code, [130, 45], 1, 5);
    roomOf(m, r.code).recordMatchEnd();

    const stats = statsOf(m, r.code);
    expect(stats.matches).toBe(2);
    expect(stats.rows.find((row) => row.nick === 'Ana')).toMatchObject({
      matches: 2,
      wins: 1,
      rounds: 8,
      totalScore: 150,
      bestScore: 20, // Chinchón: la puntuación MÁS BAJA es la mejor
      worstScore: 130,
    });
    // Empatados a victorias (1 y 1) y a partidas, desempata el total: en
    // Chinchón gana quien menos suma -- Ana 150 frente a los 155 de Beto.
    expect(stats.rows.map((row) => row.nick)).toEqual(['Ana', 'Beto']);
  });

  it('en Pocha la mejor puntuación es la MÁS ALTA', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto', 'Cris'], 'pocha');
    start(m, r, 'Ana');
    endMatch(m, r.code, [80, 45, 60], 0, 5);
    roomOf(m, r.code).recordMatchEnd();
    for (const nick of ['Ana', 'Beto', 'Cris']) {
      m.voteRematch({ roomCode: r.code, playerId: idOf(r, nick), value: true, now: NOW });
    }
    endMatch(m, r.code, [30, 95, 70], 1, 5);
    roomOf(m, r.code).recordMatchEnd();

    const stats = statsOf(m, r.code);
    expect(stats.gameId).toBe('pocha');
    expect(stats.rows.find((row) => row.nick === 'Ana')).toMatchObject({
      bestScore: 80,
      worstScore: 30,
      totalScore: 110,
    });
  });

  it('una partida que acaba por abandono también cuenta', () => {
    const m = new RoomManager();
    const r = roomWith(m, ['Ana', 'Beto']);
    start(m, r, 'Ana');
    // Beto se va: quedan menos del mínimo de Chinchón y la partida termina.
    m.leave({ roomCode: r.code, playerId: idOf(r, 'Beto'), now: NOW });

    const stats = statsOf(m, r.code);
    expect(stats.matches).toBe(1);
    expect(stats.rows.find((row) => row.nick === 'Ana')).toMatchObject({ wins: 1, matches: 1 });
  });

  it('getStats falla si la sala no existe', () => {
    const m = new RoomManager();
    const res = m.getStats({ roomCode: 'ZZZZ' });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.code).toBe('ROOM_NOT_FOUND');
  });
});
