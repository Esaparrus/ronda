import { describe, it, expect } from 'vitest';
import { createInitialState, applyAction } from './reducer.ts';
import { getPlayerView, getTableView, leakedCards } from './views.ts';
import { solveHand, canCloseWith } from './melds.ts';
import { deepFreeze } from '../../core/freeze.ts';
import {
  DEFAULT_CONFIG,
  type CardId,
  type ChinchonConfig,
  type GameAction,
  type PlayerId,
} from '@ronda/protocol';
import type { ChinchonState } from './state.ts';

const CFG: ChinchonConfig = DEFAULT_CONFIG;

/** Crea una partida estándar de 4 jugadores con semilla dada. */
function newGame(seed = 'test-1', config: ChinchonConfig = CFG): ChinchonState {
  return createInitialState({
    config,
    seed,
    players: [
      { playerId: 'p1' as PlayerId, nick: 'Ana', seat: 0 },
      { playerId: 'p2' as PlayerId, nick: 'Beto', seat: 1 },
      { playerId: 'p3' as PlayerId, nick: 'Carla', seat: 2 },
      { playerId: 'p4' as PlayerId, nick: 'Dami', seat: 3 },
    ],
    roomCode: 'TEST',
  });
}

/** Id del jugador cuyo turno es ahora. */
function turnPlayerId(state: ChinchonState): PlayerId {
  const seat = state.turnSeat;
  if (seat === null) throw new Error('no hay turno');
  const p = state.players[seat];
  if (!p) throw new Error('asiento inválido');
  return p.playerId;
}

/** Asiento del turno actual (lanza si no hay). */
function turnSeat(state: ChinchonState): number {
  if (state.turnSeat === null) throw new Error('no hay turno');
  return state.turnSeat;
}

/** Jugador en un asiento (lanza si no existe). */
function playerAt(state: ChinchonState, seat: number) {
  const p = state.players[seat];
  if (!p) throw new Error(`asiento inválido: ${seat}`);
  return p;
}

/** Jugador por playerId (lanza si no existe). */
function playerById(state: ChinchonState, pid: PlayerId) {
  const p = state.players.find((pp) => pp.playerId === pid);
  if (!p) throw new Error(`jugador no encontrado: ${pid}`);
  return p;
}

/** roundResult (lanza si null). */
function roundResult(state: ChinchonState) {
  if (!state.roundResult) throw new Error('roundResult es null');
  return state.roundResult;
}

/**
 * Mano de 8 cartas que cierra SIN chinchón (deadwood 0 al descartar la última):
 * escalera oros 1-4 + trío de 7 + copas-2 suelta. Descartando copas-2 queda
 * deadwood 0 → cierre en seco (-10). Útil para tests de cierre normal.
 */
const CLOSE_HAND: CardId[] = [
  'oros-1',
  'oros-2',
  'oros-3',
  'oros-4',
  'copas-7',
  'espadas-7',
  'bastos-7',
  'copas-2',
];
const CLOSE_DISCARD: CardId = 'copas-2';

/** Fuerza la mano del jugador en turno a `hand` y pone fase 'discard'. */
function forceTurnHand(state: ChinchonState, hand: CardId[]): ChinchonState {
  const seat = turnSeat(state);
  return {
    ...state,
    players: state.players.map((p, i) =>
      i === seat ? { ...p, hand: [...hand], lockedCardId: null } : p,
    ),
    turnPhase: 'discard',
  };
}

// ---------------------------------------------------------------------------
// 1. Reparto
// ---------------------------------------------------------------------------

describe('1. Reparto', () => {
  it('4 jugadores, semilla fija: 7 cartas cada uno, 1 descarte, 11 en el mazo', () => {
    const s = newGame('seed-A');
    // P31: 40 cartas - 28 repartidas - 1 descarte = 11. Con la baraja de 48 +
    // 2 comodines quedaban 21: la de 40 aprieta el mazo y hace que la mesa de
    // 4 llegue antes a rebarajar el descarte (§5.3).
    expect(s.deck.length).toBe(11);
    expect(s.discard.length).toBe(1);
    for (const p of s.players) {
      expect(p.hand.length).toBe(7);
    }
    expect(s.status).toBe('playing');
    expect(s.turnPhase).toBe('draw');
    // Empieza el jugador a la derecha del repartidor (asiento 0) → asiento 3.
    expect(s.turnSeat).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 2. Turno: errores de secuencia
// ---------------------------------------------------------------------------

describe('2. Turno', () => {
  it('discard antes de robar → MUST_DRAW_FIRST', () => {
    const s = newGame('seed-B');
    const pid = turnPlayerId(s);
    const firstCard = s.players[1]?.hand[0];
    if (!firstCard) throw new Error('no hay carta');
    const r = applyAction(s, pid, { type: 'discard', cardId: firstCard }, 0);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('MUST_DRAW_FIRST');
  });

  it('robar dos veces → ALREADY_DREW', () => {
    const s = newGame('seed-C');
    const pid = turnPlayerId(s);
    const r1 = applyAction(s, pid, { type: 'drawDeck' }, 0);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = applyAction(r1.value.state, pid, { type: 'drawDeck' }, 0);
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.code).toBe('ALREADY_DREW');
  });

  it('jugar fuera de turno → NOT_YOUR_TURN', () => {
    const s = newGame('seed-D');
    // El turno es del asiento 1; intenta jugar el asiento 0.
    const r = applyAction(s, 'p1' as PlayerId, { type: 'drawDeck' }, 0);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe('NOT_YOUR_TURN');
  });

  it('descartar una carta que no tienes → CARD_NOT_IN_HAND', () => {
    const s = newGame('seed-E');
    const pid = turnPlayerId(s);
    const r1 = applyAction(s, pid, { type: 'drawDeck' }, 0);
    if (!r1.ok) throw new Error('draw falló');
    const r2 = applyAction(r1.value.state, pid, { type: 'discard', cardId: 'oros-1' as CardId }, 0);
    // oros-1 puede o no estar; si no está, CARD_NOT_IN_HAND.
    if (!r2.ok) {
      expect(r2.code).toBe('CARD_NOT_IN_HAND');
    } else {
      // Si estaba, el descarte es válido.
      expect(r2.ok).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. forbidDiscardDrawnCard
// ---------------------------------------------------------------------------

describe('3. forbidDiscardDrawnCard', () => {
  it('robar del descarte y descartar esa carta → CANNOT_DISCARD_DRAWN_CARD', () => {
    const s = newGame('seed-F');
    const pid = turnPlayerId(s);
    const top = s.discard[s.discard.length - 1];
    if (!top) throw new Error('no hay descarte');
    const r1 = applyAction(s, pid, { type: 'drawDiscard' }, 0);
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    const r2 = applyAction(r1.value.state, pid, { type: 'discard', cardId: top }, 0);
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.code).toBe('CANNOT_DISCARD_DRAWN_CARD');
  });

  it('en el turno siguiente, la carta ya se puede descartar', () => {
    // Construimos una secuencia antihoraria: p4 roba del descarte (top),
    // descarta otra, pasa a p3 ... p2 ... p1 ... p4 de nuevo.
    const s = newGame('seed-G');
    let state = s;
    // Turno de p4 (asiento 3).
    const top0 = state.discard[state.discard.length - 1];
    if (!top0) throw new Error('no hay descarte');
    state = step(state, 'p4', { type: 'drawDiscard' });
    // Descarta una carta distinta de top0.
    const other = state.players[3]?.hand.find((c) => c !== top0);
    if (!other) throw new Error('no hay carta alternativa');
    state = step(state, 'p4', { type: 'discard', cardId: other });
    // Ahora top0 está en la mano de p4 pero ya no locked.
    // Avanzamos una ronda de turnos hasta volver a p4.
    state = advanceFullTurn(state, ['p3', 'p2', 'p1']);
    expect(turnPlayerId(state)).toBe('p4');
    // Roba del mazo y descarta top0 → debe ser válido.
    state = step(state, 'p4', { type: 'drawDeck' });
    const r = applyAction(state, 'p4' as PlayerId, { type: 'discard', cardId: top0 }, 0);
    expect(r.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Cierre válido e inválido
// ---------------------------------------------------------------------------

describe('4. Cierre', () => {
  it('cierre inválido (deadwood > umbral) → CANNOT_CLOSE', () => {
    // Forzamos una mano de 8 sin buenas combinaciones.
    const s = newGame('seed-H');
    const pid = turnPlayerId(s);
    // Roba.
    const r1 = applyAction(s, pid, { type: 'drawDeck' }, 0);
    if (!r1.ok) throw new Error('draw falló');
    const hand8 = playerAt(r1.value.state, turnSeat(r1.value.state)).hand;
    // Encuentra una carta cuyo descarte deje deadwood > 5 (casi cualquier).
    const badCard = hand8.find((c) => !canCloseWith(hand8, c, CFG));
    if (!badCard) return; // si todas cierran, saltamos
    const r2 = applyAction(r1.value.state, pid, { type: 'close', cardId: badCard }, 0);
    expect(r2.ok).toBe(false);
    if (r2.ok) return;
    expect(r2.code).toBe('CANNOT_CLOSE');
  });

  it('cierre válido → status roundEnd y roundResult con una fila por jugador', () => {
    const state = newGame('seed-I');
    const pid = turnPlayerId(state);
    const forced = forceTurnHand(state, CLOSE_HAND);
    const r = applyAction(forced, pid, { type: 'close', cardId: CLOSE_DISCARD }, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.state.status).toBe('roundEnd');
    expect(r.value.state.roundResult).not.toBeNull();
    expect(roundResult(r.value.state).rows.length).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 5. Cierre en seco (deadwood 0) → delta -10
// ---------------------------------------------------------------------------

describe('5. Cierre en seco', () => {
  it('el que cierra con 0 puntos recibe delta -10', () => {
    const state = newGame('seed-J');
    const pid = turnPlayerId(state);
    const forced = forceTurnHand(state, CLOSE_HAND);
    const r = applyAction(forced, pid, { type: 'close', cardId: CLOSE_DISCARD }, 0);
    if (!r.ok) throw new Error('close falló');
    const row = roundResult(r.value.state).rows.find((rr) => rr.playerId === pid);
    expect(row).toBeDefined();
    expect(row?.delta).toBe(-10);
  });
});

// ---------------------------------------------------------------------------
// 6. Chinchón con chinchonEndsGame: true → gameEnd y winner = quien lo hizo
// ---------------------------------------------------------------------------

describe('6. Chinchón', () => {
  it('chinchón termina la partida y gana quien lo hace', () => {
    const state = newGame('seed-K');
    const pid = turnPlayerId(state);
    const seat = turnSeat(state);
    const forced: ChinchonState = {
      ...state,
      // Ponemos al jugador con score 80 (va perdiendo) para verificar que aun así gana.
      players: state.players.map((p, i) =>
        i === seat
          ? {
              ...p,
              score: 80,
              hand: [
                'oros-1',
                'oros-2',
                'oros-3',
                'oros-4',
                'oros-5',
                'oros-6',
                'oros-7',
                'copas-11',
              ] as CardId[],
              lockedCardId: null,
            }
          : { ...p, score: 10 },
      ),
      turnPhase: 'discard',
    };
    const r = applyAction(forced, pid, { type: 'close', cardId: 'copas-11' as CardId }, 0);
    if (!r.ok) throw new Error('close falló');
    expect(r.value.state.status).toBe('gameEnd');
    expect(r.value.state.winnerId).toBe(pid);
  });
});

// ---------------------------------------------------------------------------
// 7. Eliminación: superar 100 puntos
// ---------------------------------------------------------------------------

describe('7. Eliminación', () => {
  it('un jugador que supera eliminationScore queda eliminated; al quedar uno, gameEnd', () => {
    const state = newGame('seed-L');
    const seat = turnSeat(state);
    const pid = turnPlayerId(state);
    const forced: ChinchonState = {
      ...state,
      players: state.players.map((p, i) =>
        i === seat ? { ...p, hand: [...CLOSE_HAND], lockedCardId: null } : { ...p, score: 99 },
      ),
      turnPhase: 'discard',
    };
    const r = applyAction(forced, pid, { type: 'close', cardId: CLOSE_DISCARD }, 0);
    if (!r.ok) throw new Error('close falló');
    // Los demás tenían 99 y suman deadwood > 0 → > 100 → eliminados.
    const eliminated = r.value.state.players.filter((p) => p.eliminated);
    expect(eliminated.length).toBe(3);
    expect(r.value.state.status).toBe('gameEnd');
  });
});

// ---------------------------------------------------------------------------
// 8. Mazo agotado → rebaraja
// ---------------------------------------------------------------------------

describe('8. Mazo agotado', () => {
  it('al vaciarse el mazo se rebaraja el descarte (menos cima) y emite deckReshuffled', () => {
    const state = newGame('seed-M');
    // Forzamos mazo vacío y descarte con varias cartas.
    const forced: ChinchonState = {
      ...state,
      deck: [],
      discard: ['oros-1', 'oros-2', 'oros-3'] as CardId[],
    };
    const pid = turnPlayerId(forced);
    const r = applyAction(forced, pid, { type: 'drawDeck' }, 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const reshuffled = r.value.events.some((e) => e.t === 'deckReshuffled');
    expect(reshuffled).toBe(true);
    // La cima del descarte viejo (oros-3) sigue siendo la cima.
    expect(r.value.state.discard[r.value.state.discard.length - 1]).toBe('oros-3');
    // El mazo se rebarajó con 2 cartas (oros-1, oros-2) y el robo sacó 1 → queda 1.
    expect(r.value.state.deck.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 9. Rondas: tras nextRound de todos, rota el repartidor
// ---------------------------------------------------------------------------

describe('9. Rondas', () => {
  it('tras nextRound de todos los activos, el repartidor rota y se reparte', () => {
    const state = newGame('seed-N');
    const pid = turnPlayerId(state);
    const forced = forceTurnHand(state, CLOSE_HAND);
    const r = applyAction(forced, pid, { type: 'close', cardId: CLOSE_DISCARD }, 0);
    if (!r.ok) throw new Error('close falló');
    expect(r.value.state.status).toBe('roundEnd');
    // Todos confirman nextRound.
    let s = r.value.state;
    for (const p of s.players.filter((pp) => !pp.eliminated && !pp.left)) {
      const rr = applyAction(s, p.playerId, { type: 'nextRound' }, 0);
      if (!rr.ok) throw new Error('nextRound falló');
      s = rr.value.state;
    }
    expect(s.status).toBe('playing');
    expect(s.round).toBe(2);
    // Repartidor rotó del 0 al siguiente asiento activo a su derecha (3).
    expect(s.dealerSeat).toBe(3);
    for (const p of s.players) {
      expect(p.hand.length).toBe(7);
    }
  });
});

// ---------------------------------------------------------------------------
// 10. Estanqueidad: no se filtran cartas ajenas durante playing
// ---------------------------------------------------------------------------

describe('10. Estanqueidad', () => {
  it('publica solo las tres cartas superiores del descarte, de abajo a arriba', () => {
    const s = newGame('seed-discard-pile');
    s.discard = ['oros-1', 'copas-2', 'espadas-3', 'bastos-4'] as CardId[];

    const view = getPlayerView(s, 'p1' as PlayerId);

    expect(view.discardCards).toEqual(['copas-2', 'espadas-3', 'bastos-4']);
    expect(view.discardTop).toBe('bastos-4');
    expect(view.discardCount).toBe(4);
  });

  it('getTableView y getPlayerView no revelan cartas ajenas mientras playing', () => {
    const s = newGame('seed-O');
    const viewA = getPlayerView(s, 'p1' as PlayerId);
    const table = getTableView(s);
    const handB = playerAt(s, 1).hand;
    const firstCardB = handB[0];
    if (!firstCardB) throw new Error('mano B vacía');

    // Buscamos el id EXACTO (entre comillas) para evitar falsos positivos por
    // substring (p.ej. "oros-1" dentro de "oros-10").
    const tableJson = JSON.stringify(table);
    expect(tableJson).not.toContain(`"${firstCardB}"`);

    // Las tres cartas superiores del descarte son públicas para representar
    // visualmente el montón sin revelar el resto de la pila.
    const allowed = s.discard.slice(-3);
    expect(viewA.discardCards).toEqual(allowed);
    const leakA = leakedCards(viewA, playerAt(s, 0).hand, allowed);
    expect(leakA).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 11. Inmutabilidad: deepFreeze(state) + applyAction no lanza
// ---------------------------------------------------------------------------

describe('11. Inmutabilidad', () => {
  it('deepFreeze(state) y applyAction no lanza', () => {
    const s = newGame('seed-P');
    deepFreeze(s);
    const pid = turnPlayerId(s);
    expect(() => applyAction(s, pid, { type: 'drawDeck' }, 0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 12. Partida completa determinista: 200 partidas con bots
// ---------------------------------------------------------------------------

describe('12. Partida completa determinista (200 partidas)', () => {
  /** Política simple de bot: roba del mazo, descarta la carta suelta de más puntos, cierra si puede. */
  function botStep(state: ChinchonState): ChinchonState {
    let s = state;
    const MAX_TURNS = 500;
    let turns = 0;
    while (s.status === 'playing' && turns < MAX_TURNS) {
      turns++;
      const seat = s.turnSeat;
      if (seat === null) break;
      const player = playerAt(s, seat);
      const pid = player.playerId;
      // Paso 1: robar.
      if (s.turnPhase === 'draw') {
        // Si el mazo da problemas, prueba discard.
        const r = applyAction(s, pid, { type: 'drawDeck' }, 0);
        if (!r.ok) {
          const r2 = applyAction(s, pid, { type: 'drawDiscard' }, 0);
          if (!r2.ok) break;
          s = r2.value.state;
        } else {
          s = r.value.state;
        }
        continue;
      }
      // Paso 2: descartar o cerrar.
      const hand8 = playerAt(s, seat).hand;
      const closable = hand8.filter((c) => canCloseWith(hand8, c, s.config));
      if (closable.length > 0) {
        const first = closable[0];
        if (!first) break;
        const r = applyAction(s, pid, { type: 'close', cardId: first }, 0);
        if (!r.ok) break;
        s = r.value.state;
        continue;
      }
      // Descarta la carta suelta de más puntos (no en mejor meld).
      const sol = solveHand(hand8);
      const inMeld = new Set<CardId>(sol.melds.flat());
      const candidates = hand8.filter((c) => !inMeld.has(c) && c !== player.lockedCardId);
      const fromCandidates = candidates[0];
      const fallback = hand8.find((c) => c !== player.lockedCardId);
      const pick = fromCandidates ?? fallback;
      if (!pick) break;
      const r = applyAction(s, pid, { type: 'discard', cardId: pick }, 0);
      if (!r.ok) break;
      s = r.value.state;
    }
    // Si la ronda terminó, los bots confirman nextRound hasta nueva ronda o gameEnd.
    let guard = 0;
    while (s.status === 'roundEnd' && guard < 50) {
      guard++;
      for (const p of s.players.filter((pp) => !pp.eliminated && !pp.left)) {
        const rr = applyAction(s, p.playerId, { type: 'nextRound' }, 0);
        if (rr.ok) s = rr.value.state;
      }
    }
    return s;
  }

  it('200 partidas: ninguna se cuelga, lanza ni termina sin winner', () => {
    for (let g = 1; g <= 200; g++) {
      const s = newGame(`game-${g}`);
      let state = s;
      let outer = 0;
      while (state.status !== 'gameEnd' && outer < 1000) {
        outer++;
        const before = state.status + ':' + state.round + ':' + state.version;
        state = botStep(state);
        const after = state.status + ':' + state.round + ':' + state.version;
        if (before === after) break; // atascado, rompe
      }
      expect(state.status).toBe('gameEnd');
      expect(state.winnerId).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Helpers de test
// ---------------------------------------------------------------------------

function step(state: ChinchonState, pid: PlayerId, action: GameAction): ChinchonState {
  const r = applyAction(state, pid, action, 0);
  if (!r.ok) throw new Error(`step falló: ${r.code} para ${pid} ${JSON.stringify(action)}`);
  return r.value.state;
}

function advanceFullTurn(state: ChinchonState, pids: PlayerId[]): ChinchonState {
  let s = state;
  for (const pid of pids) {
    s = step(s, pid, { type: 'drawDeck' });
    // Descarta una carta cualquiera que no esté bloqueada.
    const player = playerById(s, pid);
    const hand = player.hand;
    const drop = hand.find((c) => c !== player.lockedCardId) ?? hand[hand.length - 1];
    if (!drop) throw new Error('mano vacía en advanceFullTurn');
    s = step(s, pid, { type: 'discard', cardId: drop });
  }
  return s;
}
