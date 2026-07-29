import { describe, it, expect } from 'vitest';
import { RoomManager } from './room-manager.ts';
import { isValidNick, normalizeNick, nickKey } from './nick.ts';
import { createToken, hashToken } from './tokens.ts';
import { generateRoomCode } from './codes.ts';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, DEFAULT_CONFIG } from '@ronda/protocol';

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
// sweep
// ---------------------------------------------------------------------------

describe('sweep', () => {
  it('cierra una sala en lobby con 2h+ de inactividad', () => {
    const m = mgr();
    const c = m.createRoom({ gameId: 'chinchon', config: DEFAULT_CONFIG, nick: 'A1', now: NOW });
    if (!c.ok) throw new Error();
    // 3h después, sin actividad.
    const closed = m.sweep(NOW + 3 * 60 * 60 * 1000);
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
});
