import { describe, it, expect, vi } from 'vitest';
import { RoomManager } from './room-manager.ts';
import { isValidNick, normalizeNick, nickKey } from './nick.ts';
import { createToken, hashToken } from './tokens.ts';
import { generateRoomCode } from './codes.ts';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, DEFAULT_CONFIG, DEFAULT_POCHA_CONFIG } from '@ronda/protocol';

const NOW = 1_000_000;

function mgr() {
  return new RoomManager();
}

/** Sala por código (lanza si no existe). */
function room(m: RoomManager, code: string) {
  const r = m.getRoomByCode(code);
  if (!r) throw new Error(`sala no encontrada: ${code}`);
  return r;
}

/** Estado del motor de una sala (lanza si es null). */
function stateOf(r: ReturnType<RoomManager['getRoomByCode']>) {
  if (!r || !r.state) throw new Error('sala sin estado');
  return r.state;
}

/** playerId del turno actual (lanza si no hay). */
function turnPlayerId(s: NonNullable<NonNullable<ReturnType<RoomManager['getRoomByCode']>>['state']>) {
  const seat = s.turnSeat;
  if (seat === null) throw new Error('no hay turno');
  const p = s.players[seat];
  if (!p) throw new Error('asiento inválido');
  return p.playerId;
}

// ---------------------------------------------------------------------------
// codes
// ---------------------------------------------------------------------------

describe('generateRoomCode', () => {
  it('devuelve código de 4 caracteres del alfabeto permitido', () => {
    const code = generateRoomCode(() => false);
    expect(code).not.toBeNull();
    if (!code) throw new Error('código null');
    expect(code.length).toBe(ROOM_CODE_LENGTH);
    for (const ch of code) {
      expect(ROOM_CODE_ALPHABET).toContain(ch);
    }
  });

  it('reintenta si el código está tomado', () => {
    let calls = 0;
    const taken = (_c: string) => {
      calls++;
      return calls <= 3; // los 3 primeros "tomados"
    };
    const code = generateRoomCode(taken);
    expect(code).not.toBeNull();
    expect(calls).toBeGreaterThanOrEqual(4);
  });

  it('devuelve null tras 10 intentos fallidos', () => {
    const code = generateRoomCode(() => true); // todo tomado
    expect(code).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// tokens
// ---------------------------------------------------------------------------

describe('tokens', () => {
  it('createToken genera un string distinto cada vez', () => {
    const a = createToken();
    const b = createToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(20);
  });
  it('hashToken es determinista y distinto del token', () => {
    const t = createToken();
    expect(hashToken(t)).toBe(hashToken(t));
    expect(hashToken(t)).not.toBe(t);
    expect(hashToken(t)).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// nick
// ---------------------------------------------------------------------------

describe('nick', () => {
  it('valida longitudes 2-12 y charset permitido', () => {
    expect(isValidNick('Ana')).toBe(true);
    expect(isValidNick('A')).toBe(false); // muy corto
    expect(isValidNick('abcdefghijklm')).toBe(false); // 13, muy largo
    expect(isValidNick('María José')).toBe(true); // tilde y espacio
    expect(isValidNick('Ñoño')).toBe(true);
    expect(isValidNick('Player-1')).toBe(true);
    expect(isValidNick('bad@nick')).toBe(false);
  });
  it('normaliza recortando y colapsando espacios', () => {
    expect(normalizeNick('  Ana   María ')).toBe('Ana María');
  });
  it('nickKey es case-insensitive', () => {
    expect(nickKey('Ana')).toBe(nickKey('ANA'));
    expect(nickKey('Ana')).toBe(nickKey('ana'));
  });
});

// ---------------------------------------------------------------------------
// RoomManager: create / join
// ---------------------------------------------------------------------------

describe('RoomManager create/join', () => {
  it('crear sala devuelve código de 4 caracteres del alfabeto', () => {
    const m = mgr();
    const r = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'Ana', now: NOW });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.roomCode.length).toBe(4);
    for (const ch of r.value.roomCode) expect(ROOM_CODE_ALPHABET).toContain(ch);
    expect(r.value.seat).toBe(0);
  });

  it('crear con apodo inválido → NICK_INVALID', () => {
    const m = mgr();
    const r = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A', now: NOW });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('NICK_INVALID');
  });

  it('unirse con apodo repetido → NICK_TAKEN', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'Ana', now: NOW });
    if (!c.ok) throw new Error();
    const r = m.joinRoom({ roomCode: c.value.roomCode, nick: 'ana', now: NOW });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('NICK_TAKEN');
  });

  it('quinto jugador → ROOM_FULL', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    for (let i = 2; i <= 4; i++) {
      const r = m.joinRoom({ roomCode: c.value.roomCode, nick: `A${i}`, now: NOW });
      expect(r.ok).toBe(true);
    }
    const r5 = m.joinRoom({ roomCode: c.value.roomCode, nick: 'A5', now: NOW });
    expect(r5.ok).toBe(false);
    if (r5.ok) return;
    expect(r5.code).toBe('ROOM_FULL');
  });

  it('unirse a sala ya empezada → ROOM_ALREADY_STARTED', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });
    const r = m.joinRoom({ roomCode: c.value.roomCode, nick: 'A3', now: NOW });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('ROOM_ALREADY_STARTED');
  });
});

// ---------------------------------------------------------------------------
// start / resume / token
// ---------------------------------------------------------------------------

describe('RoomManager start/resume', () => {
  it('start con 1 jugador → NOT_ENOUGH_PLAYERS', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    const r = m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('NOT_ENOUGH_PLAYERS');
  });

  it('start por quien no es anfitrión → NOT_HOST', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    const j = m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    if (!j.ok) throw new Error();
    const r = m.start({ roomCode: c.value.roomCode, playerId: j.value.playerId, now: NOW });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('NOT_HOST');
  });

  it('start correcto → estado playing y 7 cartas por jugador', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    const r = m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });
    expect(r.ok).toBe(true);
    const rm = room(m, c.value.roomCode);
    expect(rm.status).toBe('playing');
    expect(rm.state).not.toBeNull();
    for (const p of stateOf(rm).players) expect(p.hand.length).toBe(7);
  });

  it('resumeByToken con token válido devuelve mismo playerId y asiento', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    const r = m.resumeByToken({
      roomCode: c.value.roomCode,
      playerToken: c.value.playerToken,
      now: NOW,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.playerId).toBe(c.value.playerId);
    expect(r.value.seat).toBe(0);
  });

  it('resumeByToken con token inválido → INVALID_TOKEN', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    const r = m.resumeByToken({
      roomCode: c.value.roomCode,
      playerToken: 'token-falso',
      now: NOW,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('INVALID_TOKEN');
  });
});

// ---------------------------------------------------------------------------
// idempotencia y STALE_VERSION
// ---------------------------------------------------------------------------

describe('RoomManager applyAction', () => {
  it('idempotencia: mismo clientActionId deja una sola mutación y misma versión', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });
    const st = stateOf(room(m, c.value.roomCode));
    // El turno empieza en el asiento siguiente al repartidor (0) → asiento 1 (A2).
    const turnPid = turnPlayerId(st);
    const v0 = st.version;
    const r1 = m.applyAction({
      roomCode: c.value.roomCode,
      playerId: turnPid,
      clientActionId: 'ca-1',
      expectedVersion: v0,
      action: { type: 'drawDeck' },
      now: NOW,
    });
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const v1 = r1.value.version;
    // Repetir el mismo clientActionId devuelve v1 y NO aplica de nuevo.
    const r2 = m.applyAction({
      roomCode: c.value.roomCode,
      playerId: turnPid,
      clientActionId: 'ca-1',
      expectedVersion: v0,
      action: { type: 'drawDeck' },
      now: NOW,
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.version).toBe(v1);
  });

  it('expectedVersion desfasada → STALE_VERSION', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });
    const st = stateOf(room(m, c.value.roomCode));
    const turnPid = turnPlayerId(st);
    const r = m.applyAction({
      roomCode: c.value.roomCode,
      playerId: turnPid,
      clientActionId: 'ca-x',
      expectedVersion: 99999, // desfasada
      action: { type: 'drawDeck' },
      now: NOW,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('STALE_VERSION');
  });
});

describe('temporizador de Chinchón', () => {
  it('al agotarse roba y descarta una carta legal, sin cerrar', () => {
    vi.useFakeTimers();
    try {
      let timeoutSnapshots = 0;
      const m = new RoomManager(() => ({ onTurnTimeout: () => timeoutSnapshots++ }));
      const config = { ...DEFAULT_CONFIG, turnTimeSeconds: 30 as const };
      const c = m.createRoom({ gameId: 'chinchon', config, nick: 'A1', now: NOW });
      if (!c.ok) throw new Error();
      const j = m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
      if (!j.ok) throw new Error();
      m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });

      const before = stateOf(room(m, c.value.roomCode));
      if (before.gameId !== 'chinchon') throw new Error('esperaba Chinchón');
      const timedSeat = before.turnSeat;
      expect(before.turnDeadlineAt).toBe(NOW + 30_000);
      vi.advanceTimersByTime(30_000);

      const after = stateOf(room(m, c.value.roomCode));
      if (after.gameId !== 'chinchon') throw new Error('esperaba Chinchón');
      expect(after.status).toBe('playing');
      expect(after.turnSeat).not.toBe(timedSeat);
      expect(after.turnPhase).toBe('draw');
      expect(after.discard.length).toBe(2);
      expect(after.turnDeadlineAt).toBe(Date.now() + 30_000);
      expect(timeoutSnapshots).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// traspaso de anfitrión
// ---------------------------------------------------------------------------

describe('traspaso de anfitrión', () => {
  it('tras 45s desconectado, el anfitrión pasa al conectado de asiento más bajo', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    const j2 = m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    if (!j2.ok) throw new Error();
    // El anfitrión (A1) se desconecta.
    m.setConnected({
      roomCode: c.value.roomCode,
      playerId: c.value.playerId,
      connected: false,
      socketId: null,
      now: NOW,
    });
    // Antes del grace, sigue siendo host.
    m.maybeTransferHost(NOW + 10_000);
    expect(room(m, c.value.roomCode).hostPlayerId).toBe(c.value.playerId);
    // Tras 45s, traspasa a A2 (asiento más bajo conectado).
    m.maybeTransferHost(NOW + 46_000);
    expect(room(m, c.value.roomCode).hostPlayerId).toBe(j2.value.playerId);
  });
});

// ---------------------------------------------------------------------------
// revancha
// ---------------------------------------------------------------------------

describe('revancha', () => {
  // Bot mínimo para llevar una partida hasta gameEnd sin calcular reglas por
  // su cuenta: en su turno roba SIEMPRE del mazo (nunca del descarte, así
  // `lockedCardId` nunca entra en juego) y prueba `close` con cada carta de
  // la mano de 8, fiándose de si el propio RoomManager lo acepta o lo
  // rechaza (CANNOT_CLOSE) -- igual que haría un cliente real probando
  // suerte, no un oráculo de reglas. Si ninguna cierra, descarta la
  // primera. `closeThreshold: 10` (máximo permitido) y `eliminationScore:
  // 50` (mínimo permitido) se usan solo para que el bot llegue a gameEnd en
  // un número acotado de rondas; no cambian ninguna regla, solo hacen más
  // fácil cerrar y más rápida la eliminación.
  // `clientActionId` tiene que ser único en TODA la vida de la sala, no solo
  // dentro de una ronda: `room.processedActions` (idempotencia, contrato
  // §2.4) no se limpia entre rondas. `crypto.randomUUID()` evita reintroducir
  // ese bug (un contador que se reinicia por ronda colisionaría con ids ya
  // usados en la ronda anterior y el servidor devolvería, por idempotencia,
  // la respuesta CACHEADA de la ronda anterior en vez de aplicar la acción
  // nueva -- exactamente el fallo que reprodujo esto la primera vez).
  function playOneTurn(m: RoomManager, roomCode: string): void {
    const st = stateOf(room(m, roomCode));
    const turnPid = turnPlayerId(st);
    const draw = m.applyAction({
      roomCode,
      playerId: turnPid,
      clientActionId: crypto.randomUUID(),
      expectedVersion: st.version,
      action: { type: 'drawDeck' },
      now: NOW,
    });
    if (!draw.ok) throw new Error(`robar falló: ${draw.code}`);

    const st2 = stateOf(room(m, roomCode));
    if (st2.status !== 'playing') return; // el robo agotó mazo+descarte y terminó la ronda sin cierre
    const player = st2.players.find((p) => p.playerId === turnPid);
    if (!player) throw new Error('jugador no encontrado tras robar');

    for (const cardId of player.hand) {
      const res = m.applyAction({
        roomCode,
        playerId: turnPid,
        clientActionId: crypto.randomUUID(),
        expectedVersion: stateOf(room(m, roomCode)).version,
        action: { type: 'close', cardId },
        now: NOW,
      });
      if (res.ok) return; // cerró: ronda terminada
    }

    const firstCard = player.hand[0];
    if (firstCard === undefined) throw new Error('mano vacía tras robar');
    const discardRes = m.applyAction({
      roomCode,
      playerId: turnPid,
      clientActionId: crypto.randomUUID(),
      expectedVersion: stateOf(room(m, roomCode)).version,
      action: { type: 'discard', cardId: firstCard },
      now: NOW,
    });
    if (!discardRes.ok) throw new Error(`descartar falló: ${discardRes.code}`);
  }

  function playUntilStatusChanges(m: RoomManager, roomCode: string, maxTurns = 400): void {
    for (let i = 0; i < maxTurns; i++) {
      if (stateOf(room(m, roomCode)).status !== 'playing') return;
      playOneTurn(m, roomCode);
    }
    throw new Error(`no terminó la ronda/partida en ${maxTurns} turnos`);
  }

  it('con revancha aceptada por todos, empieza partida nueva con los mismos asientos y el marcador a cero', () => {
    const m = mgr();
    const config = {
      ...DEFAULT_CONFIG,
      closeThreshold: 10 as const,
      eliminationScore: 50 as const,
    };
    const c = m.createRoom({ gameId: 'chinchon', config, nick: 'Ana', now: NOW });
    if (!c.ok) throw new Error();
    const j = m.joinRoom({ roomCode: c.value.roomCode, nick: 'Bruno', now: NOW });
    if (!j.ok) throw new Error();
    m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });

    // Juega hasta gameEnd. Con eliminationScore bajo (50) y closeThreshold
    // alto (10), un puñado de rondas bastan; se pone un tope por si acaso.
    let guardRounds = 0;
    while (stateOf(room(m, c.value.roomCode)).status !== 'gameEnd') {
      guardRounds++;
      if (guardRounds > 20) throw new Error('la partida no terminó en 20 rondas');
      playUntilStatusChanges(m, c.value.roomCode);
      const st = stateOf(room(m, c.value.roomCode));
      if (st.status === 'roundEnd') {
        // Ambos confirman la siguiente ronda (mismo evento que dispara
        // «Siguiente ronda» en /sala, contrato P16).
        const rA = m.applyAction({
          roomCode: c.value.roomCode,
          playerId: c.value.playerId,
          clientActionId: crypto.randomUUID(),
          expectedVersion: st.version,
          action: { type: 'nextRound' },
          now: NOW,
        });
        if (!rA.ok) throw new Error(`nextRound (Ana) falló: ${rA.code}`);
        const rB = m.applyAction({
          roomCode: c.value.roomCode,
          playerId: j.value.playerId,
          clientActionId: crypto.randomUUID(),
          expectedVersion: stateOf(room(m, c.value.roomCode)).version,
          action: { type: 'nextRound' },
          now: NOW,
        });
        if (!rB.ok) throw new Error(`nextRound (Bruno) falló: ${rB.code}`);
      }
    }

    const seatsBefore = stateOf(room(m, c.value.roomCode)).players.map((p) => ({
      playerId: p.playerId,
      seat: p.seat,
    }));

    // Revancha: Ana vota que sí -- todavía no basta (falta Bruno).
    const v1 = m.voteRematch({
      roomCode: c.value.roomCode,
      playerId: c.value.playerId,
      value: true,
      now: NOW,
    });
    expect(v1.ok).toBe(true);
    expect(stateOf(room(m, c.value.roomCode)).status).toBe('gameEnd');

    // Bruno también vota que sí -- ahora sí, los dos conectados han votado.
    const v2 = m.voteRematch({
      roomCode: c.value.roomCode,
      playerId: j.value.playerId,
      value: true,
      now: NOW,
    });
    expect(v2.ok).toBe(true);

    const after = stateOf(room(m, c.value.roomCode));
    expect(after.status).toBe('playing');
    expect(after.rematchVotes).toEqual([]);
    for (const p of after.players) {
      // Sala de Chinchón (createRoom más arriba): `p` es ChinchonPlayer, con
      // `eliminated`. El estado del motor ahora es una unión (Chinchón|Pocha|
      // Mus, room.ts) porque el servidor ya no asume un único juego, y el
      // jugador de Mus ni siquiera tiene `score` (§12.12).
      if (!('eliminated' in p)) throw new Error('esperaba ChinchonPlayer');
      expect(p.score).toBe(0);
      expect(p.eliminated).toBe(false);
    }
    const seatsAfter = after.players.map((p) => ({ playerId: p.playerId, seat: p.seat }));
    expect(seatsAfter).toEqual(seatsBefore);
  });
});

describe('sweep', () => {
  it('cierra una sala en lobby con 2h+ de inactividad', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    // Exactamente al cumplir las 2h, sin actividad.
    const closed = m.sweep(NOW + 2 * 60 * 60 * 1000);
    expect(closed).toBe(1);
    expect(m.getRoomByCode(c.value.roomCode)).toBeUndefined();
  });

  it('no cierra una sala en lobby reciente', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    const closed = m.sweep(NOW + 60_000);
    expect(closed).toBe(0);
    expect(m.getRoomByCode(c.value.roomCode)).toBeDefined();
  });

  it('cierra una partida sin jugadores conectados al cumplir 6h', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    const j = m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    if (!j.ok) throw new Error();
    const started = m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });
    expect(started.ok).toBe(true);

    for (const playerId of [c.value.playerId, j.value.playerId]) {
      m.setConnected({
        roomCode: c.value.roomCode,
        playerId,
        connected: false,
        socketId: null,
        now: NOW,
      });
    }

    expect(m.sweep(NOW + 6 * 60 * 60 * 1000 - 1)).toBe(0);
    expect(m.sweep(NOW + 6 * 60 * 60 * 1000)).toBe(1);
    expect(m.getRoomByCode(c.value.roomCode)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Pocha (segundo juego, cableado en el servidor): el motor y el protocolo ya
// estaban terminados (P22); estos tests cubren que RoomManager despacha de
// verdad por `gameId` en vez de asumir Chinchón.
// ---------------------------------------------------------------------------

describe('Pocha', () => {
  it('crea una sala de Pocha', () => {
    const m = mgr();
    const r = m.createRoom({ gameId: 'pocha', config: DEFAULT_POCHA_CONFIG, nick: 'Ana', now: NOW });
    expect(r.ok).toBe(true);
  });

  it('start() con 3 jugadores reparte una ronda de verdad', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'pocha', config: DEFAULT_POCHA_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    m.joinRoom({ roomCode: c.value.roomCode, nick: 'A3', now: NOW });
    const r = m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });
    expect(r.ok).toBe(true);

    const state = stateOf(room(m, c.value.roomCode));
    expect(state.gameId).toBe('pocha');
    // Ronda 1 de la pirámide siempre reparte 1 carta por jugador (§9.2).
    expect(state.players.every((p) => p.hand.length === 1)).toBe(true);
    expect(state.turnSeat).not.toBeNull();
  });

  it('start() con 2 jugadores -> NOT_ENOUGH_PLAYERS (Pocha exige mínimo 3, §9.2)', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'pocha', config: DEFAULT_POCHA_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    const r = m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error();
    expect(r.code).toBe('NOT_ENOUGH_PLAYERS');
  });

  it('rematch reinicia una partida de Pocha con gameId y marcador a cero', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'pocha', config: DEFAULT_POCHA_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    const j2 = m.joinRoom({ roomCode: c.value.roomCode, nick: 'A2', now: NOW });
    const j3 = m.joinRoom({ roomCode: c.value.roomCode, nick: 'A3', now: NOW });
    if (!j2.ok || !j3.ok) throw new Error();
    m.start({ roomCode: c.value.roomCode, playerId: c.value.playerId, now: NOW });

    // Fuerza directamente el fin de partida (sin jugar las 25 rondas de la
    // pirámide de 3 jugadores): el reducer no expone eso, así que se muta el
    // estado del motor como haría el propio reducer al terminar la última
    // ronda -- mismo atajo que ya usan los tests de revancha de Chinchón más
    // arriba en este fichero.
    const before = room(m, c.value.roomCode);
    if (!before.state) throw new Error('sin estado');
    before.state = { ...before.state, status: 'gameEnd' };
    before.status = 'gameEnd';

    for (const p of [c.value, j2.value, j3.value]) {
      const v = m.voteRematch({ roomCode: c.value.roomCode, playerId: p.playerId, value: true, now: NOW });
      expect(v.ok).toBe(true);
    }

    const after = stateOf(room(m, c.value.roomCode));
    expect(after.gameId).toBe('pocha');
    expect(after.status).toBe('playing');
    // Sala de Pocha: sus jugadores sí tienen `score` (a diferencia de los de
    // Mus, §12.12), pero hay que estrecharlo desde la unión de `EngineState`.
    expect(after.players.every((p) => 'score' in p && p.score === 0)).toBe(true);
  });
});
