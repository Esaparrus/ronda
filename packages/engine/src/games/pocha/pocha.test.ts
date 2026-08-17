import { describe, it, expect } from 'vitest';
import { PochaConfigSchema, type PlayerId } from '@ronda/protocol';
import { createInitialState, applyAction } from './reducer.ts';
import { getPlayerView, getTableView } from './views.ts';
import { maxRoundSize, totalRounds, roundSizeFor } from './rounds.ts';
import { resolveTrick, fuerza } from './trick.ts';
import { buildPochaDeck, POCHA_DECK_SIZE } from './deck.ts';
import { activePlayers, nextActiveSeat, type PochaState } from './state.ts';
import { deepFreeze } from '../../core/freeze.ts';

const DEFAULT_CFG = PochaConfigSchema.parse({});

const FOUR_PLAYERS = [
  { playerId: 'p1' as PlayerId, nick: 'Ana', seat: 0 },
  { playerId: 'p2' as PlayerId, nick: 'Beto', seat: 1 },
  { playerId: 'p3' as PlayerId, nick: 'Carla', seat: 2 },
  { playerId: 'p4' as PlayerId, nick: 'Dami', seat: 3 },
];

function newGame(seed = 'test-1', config = DEFAULT_CFG): PochaState {
  return createInitialState({ config, players: FOUR_PLAYERS, seed, roomCode: 'TEST' });
}

describe('sentido de juego', () => {
  it('empieza a la derecha del repartidor y avanza en sentido antihorario', () => {
    const state = newGame('direction');
    expect(state.dealerSeat).toBe(0);
    expect(state.turnSeat).toBe(3);
    expect(nextActiveSeat(state, 3)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Golden test 1 (§9.11): pirámide de rondas
// ---------------------------------------------------------------------------

describe('pirámide de rondas (§9.2, golden test 1)', () => {
  it('4 jugadores: M = floor(39/4) = 9', () => {
    expect(maxRoundSize(4)).toBe(9);
  });

  it('4 jugadores: secuencia exacta [1..9..1], 17 rondas', () => {
    const n = 4;
    const total = totalRounds(n);
    expect(total).toBe(17);
    const sizes = Array.from({ length: total }, (_, i) => roundSizeFor(i + 1, n));
    expect(sizes).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('tabla del contrato: 3→13/25, 4→9/17, 5→7/13, 6→6/11', () => {
    expect([maxRoundSize(3), totalRounds(3)]).toEqual([13, 25]);
    expect([maxRoundSize(4), totalRounds(4)]).toEqual([9, 17]);
    expect([maxRoundSize(5), totalRounds(5)]).toEqual([7, 13]);
    expect([maxRoundSize(6), totalRounds(6)]).toEqual([6, 11]);
  });
});

// ---------------------------------------------------------------------------
// Baraja
// ---------------------------------------------------------------------------

describe('buildPochaDeck (§9.1)', () => {
  it('40 cartas, sin 8 ni 9, sin comodines', () => {
    const deck = buildPochaDeck();
    expect(deck.length).toBe(POCHA_DECK_SIZE);
    // P31: que no haya ochos, nueves ni comodines lo garantiza ya el tipo
    // `Rank`, así que se comprueba por id -- que es lo que viaja por el socket.
    const noIds = ['oros-8', 'oros-9', 'joker-1', 'joker-2'];
    for (const bad of noIds) expect(deck.some((c) => c.id === bad)).toBe(false);
    const ids = new Set(deck.map((c) => c.id));
    expect(ids.size).toBe(40);
  });
});

// ---------------------------------------------------------------------------
// Golden tests 4, 5, 5b (§9.11): resolución de baza
// ---------------------------------------------------------------------------

describe('resolveTrick (§9.6, golden tests 4/5/5b)', () => {
  it('test 4: triunfo decide la baza, independiente de rankOrder', () => {
    const trick = [
      { seat: 0, cardId: 'bastos-10' },
      { seat: 1, cardId: 'bastos-12' },
      { seat: 2, cardId: 'oros-2' },
      { seat: 3, cardId: 'bastos-7' },
    ];
    expect(resolveTrick(trick, 'bastos', 'oros', 'numerico')).toBe(2);
    expect(resolveTrick(trick, 'bastos', 'oros', 'brisca')).toBe(2);
  });

  it('test 5: sin triunfo en la baza, orden numérico → gana copas-11', () => {
    const trick = [
      { seat: 0, cardId: 'copas-3' },
      { seat: 1, cardId: 'copas-11' },
      { seat: 2, cardId: 'oros-7' }, // no pudo asistir, no cuenta
      { seat: 3, cardId: 'copas-6' },
    ];
    // "sin triunfo jugado" (§9.11 test 5): el triunfo, si lo hay, no es oros
    // -- si lo fuera, oros-7 SÍ contaría como triunfo y ganaría la baza (tal
    // y como exige el propio algoritmo del §9.6). Se modela aquí como
    // trumpSuit null, el caso más simple que cumple "ningún triunfo jugado".
    expect(resolveTrick(trick, 'copas', null, 'numerico')).toBe(1);
  });

  it('test 5b: misma baza, orden brisca → gana copas-3 (Tres, fuerza 9 > Caballo, fuerza 7)', () => {
    const trick = [
      { seat: 0, cardId: 'copas-3' },
      { seat: 1, cardId: 'copas-11' },
      { seat: 2, cardId: 'oros-7' },
      { seat: 3, cardId: 'copas-6' },
    ];
    expect(resolveTrick(trick, 'copas', null, 'brisca')).toBe(0);
  });

  it('tabla de fuerza brisca del contrato §9.6', () => {
    expect(fuerza(1, 'brisca')).toBe(10);
    expect(fuerza(3, 'brisca')).toBe(9);
    expect(fuerza(12, 'brisca')).toBe(8);
    expect(fuerza(11, 'brisca')).toBe(7);
    expect(fuerza(10, 'brisca')).toBe(6);
    expect(fuerza(7, 'brisca')).toBe(5);
    expect(fuerza(6, 'brisca')).toBe(4);
    expect(fuerza(5, 'brisca')).toBe(3);
    expect(fuerza(4, 'brisca')).toBe(2);
    expect(fuerza(2, 'brisca')).toBe(1);
  });

  it('numerico es idéntico al rank (§9.6)', () => {
    for (const r of [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const) {
      expect(fuerza(r, 'numerico')).toBe(r);
    }
  });
});

// ---------------------------------------------------------------------------
// Golden tests 2, 3 (§9.11): regla del enganche
// ---------------------------------------------------------------------------

describe('regla del enganche (§9.4, golden tests 2/3)', () => {
  /** Estado mínimo válido en fase de cante, con roundSize y dealerSeat elegidos
   * a mano -- applyBid no toca las manos, así que no hace falta que sean
   * consistentes con una baraja real repartida. */
  function biddingState(roundSize: number, dealerSeat: number): PochaState {
    const base = newGame('hook-fixture');
    return {
      ...base,
      phase: 'bidding',
      roundSize,
      dealerSeat,
      turnSeat: (dealerSeat - 1 + 4) % 4,
      players: base.players.map((p) => ({ ...p, bid: null })),
    };
  }

  it('test 2: enganche activo -- ronda de 4 bazas, cantes 1,1,1 → repartidor no puede cantar 1', () => {
    let state = biddingState(4, 3);
    for (const pid of ['p3', 'p2', 'p1'] as const) {
      const r = applyAction(state, pid, { type: 'bid', amount: 1 }, 0);
      expect(r.ok).toBe(true);
      if (r.ok) state = r.value.state;
    }
    const hooked = applyAction(state, 'p4' as PlayerId, { type: 'bid', amount: 1 }, 0);
    expect(hooked.ok).toBe(false);
    if (!hooked.ok) expect(hooked.code).toBe('BID_HOOKED');

    // Cualquier otro valor de 0..4 (menos el 1) es válido.
    for (const amount of [0, 2, 3, 4]) {
      const r = applyAction(state, 'p4' as PlayerId, { type: 'bid', amount }, 0);
      expect(r.ok).toBe(true);
    }
  });

  it('test 3a: enganche sigue aplicando con roundSize=5 (forbidden=2, dentro de rango)', () => {
    let state = biddingState(5, 3);
    for (const pid of ['p3', 'p2', 'p1'] as const) {
      const r = applyAction(state, pid, { type: 'bid', amount: 1 }, 0);
      expect(r.ok).toBe(true);
      if (r.ok) state = r.value.state;
    }
    const hooked = applyAction(state, 'p4' as PlayerId, { type: 'bid', amount: 2 }, 0);
    expect(hooked.ok).toBe(false);
    if (!hooked.ok) expect(hooked.code).toBe('BID_HOOKED');
    const okBid = applyAction(state, 'p4' as PlayerId, { type: 'bid', amount: 1 }, 0);
    expect(okBid.ok).toBe(true);
  });

  it('test 3b: enganche no aplica si el valor prohibido cae fuera de [0, roundSize]', () => {
    let state = biddingState(4, 3);
    for (const pid of ['p3', 'p2', 'p1'] as const) {
      const r = applyAction(state, pid, { type: 'bid', amount: 2 }, 0);
      expect(r.ok).toBe(true);
      if (r.ok) state = r.value.state;
    }
    // forbidden = 4 - 6 = -2, fuera de rango: el repartidor puede cantar libremente.
    for (const amount of [0, 1, 2, 3, 4]) {
      const r = applyAction(state, 'p4' as PlayerId, { type: 'bid', amount }, 0);
      expect(r.ok).toBe(true);
    }
  });

  it('cantar fuera de [0, roundSize] es INVALID_BID (para cualquier jugador)', () => {
    const state = biddingState(4, 3);
    const tooHigh = applyAction(state, 'p3' as PlayerId, { type: 'bid', amount: 5 }, 0);
    expect(tooHigh.ok).toBe(false);
    if (!tooHigh.ok) expect(tooHigh.code).toBe('INVALID_BID');
    const negative = applyAction(state, 'p3' as PlayerId, { type: 'bid', amount: -1 }, 0);
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.code).toBe('INVALID_BID');
  });
});

// ---------------------------------------------------------------------------
// Golden test 6 (§9.11): puntuación
// ---------------------------------------------------------------------------

describe('puntuación de la ronda (§9.7, golden test 6)', () => {
  it('cantó 3 y ganó 3 → 13 puntos; cantó 2 y ganó 0 → 0 puntos', () => {
    let state = newGame('scoring-1');
    // Fuerza una ronda de 3 bazas: p1 lleva oros las tres veces, nadie más
    // tiene oros en la mano, así que p1 gana siempre (sin ambigüedad de
    // triunfo: se anula explícitamente para este test).
    const hands: Record<string, string[]> = {
      p1: ['oros-1', 'oros-2', 'oros-3'],
      p2: ['copas-1', 'copas-2', 'copas-3'],
      p3: ['espadas-1', 'espadas-2', 'espadas-3'],
      p4: ['bastos-1', 'bastos-2', 'bastos-3'],
    };
    state = {
      ...state,
      phase: 'trick',
      roundSize: 3,
      dealerSeat: 3,
      turnSeat: 0,
      leadSuit: null,
      currentTrick: [],
      trumpSuit: null,
      trumpCardId: null,
      players: state.players.map((p) => ({
        ...p,
        bid: p.playerId === 'p1' ? 3 : p.playerId === 'p2' ? 2 : 0,
        tricksWon: 0,
        hand: [...(hands[p.playerId] ?? [])],
      })),
    };

    for (let trick = 0; trick < 3; trick++) {
      for (const pid of ['p1', 'p4', 'p3', 'p2'] as const) {
        const card = hands[pid]?.[trick];
        if (!card) continue;
        const r = applyAction(state, pid as PlayerId, { type: 'playCard', cardId: card }, 0);
        expect(r.ok).toBe(true);
        if (r.ok) state = r.value.state;
      }
    }

    expect(state.status).toBe('roundEnd');
    const p1Row = state.roundResult?.rows.find((r) => r.playerId === 'p1');
    expect(p1Row?.bid).toBe(3);
    expect(p1Row?.tricksWon).toBe(3);
    expect(p1Row?.delta).toBe(13);

    const p2Row = state.roundResult?.rows.find((r) => r.playerId === 'p2');
    expect(p2Row?.bid).toBe(2);
    expect(p2Row?.tricksWon).toBe(0);
    expect(p2Row?.delta).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Obligación de asistir (§9.5)
// ---------------------------------------------------------------------------

describe('obligación de asistir (§9.5)', () => {
  it('jugar fuera de palo teniendo cartas del palo que salió → MUST_FOLLOW_SUIT', () => {
    let state = newGame('follow-suit-1');
    state = {
      ...state,
      phase: 'trick',
      roundSize: 2,
      dealerSeat: 3,
      turnSeat: 0,
      leadSuit: null,
      currentTrick: [],
      players: state.players.map((p) => ({
        ...p,
        bid: 0,
        hand:
          p.playerId === 'p1'
            ? ['oros-1', 'copas-1']
            : p.playerId === 'p4'
              ? ['oros-2', 'bastos-2']
              : p.playerId === 'p3'
                ? ['espadas-3', 'espadas-4']
                : ['bastos-4', 'bastos-5'],
      })),
    };
    const lead = applyAction(state, 'p1' as PlayerId, { type: 'playCard', cardId: 'oros-1' }, 0);
    expect(lead.ok).toBe(true);
    if (!lead.ok) return;
    state = lead.value.state;

    const illegal = applyAction(
      state,
      'p4' as PlayerId,
      { type: 'playCard', cardId: 'bastos-2' },
      0,
    );
    expect(illegal.ok).toBe(false);
    if (!illegal.ok) expect(illegal.code).toBe('MUST_FOLLOW_SUIT');

    const legal = applyAction(state, 'p4' as PlayerId, { type: 'playCard', cardId: 'oros-2' }, 0);
    expect(legal.ok).toBe(true);
  });

  it('sin cartas del palo que salió, puede jugar cualquier carta (incluido triunfo)', () => {
    let state = newGame('follow-suit-2');
    state = {
      ...state,
      phase: 'trick',
      roundSize: 2,
      dealerSeat: 3,
      turnSeat: 0,
      leadSuit: null,
      currentTrick: [],
      trumpSuit: 'bastos',
      players: state.players.map((p) => ({
        ...p,
        bid: 0,
        hand:
          p.playerId === 'p1'
            ? ['oros-1', 'copas-1']
            : p.playerId === 'p4'
              ? ['bastos-2', 'espadas-2'] // sin oros: puede jugar lo que quiera
              : p.playerId === 'p3'
                ? ['espadas-3', 'espadas-4']
                : ['bastos-4', 'bastos-5'],
      })),
    };
    const lead = applyAction(state, 'p1' as PlayerId, { type: 'playCard', cardId: 'oros-1' }, 0);
    expect(lead.ok).toBe(true);
    if (!lead.ok) return;
    state = lead.value.state;
    const r = applyAction(state, 'p4' as PlayerId, { type: 'playCard', cardId: 'bastos-2' }, 0);
    expect(r.ok).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Vistas: censura de manos ajenas
// ---------------------------------------------------------------------------

describe('vistas (§2.5)', () => {
  it('getTableView no expone mano de nadie; getPlayerView solo la propia', () => {
    const state = newGame('views-1');
    const table = getTableView(state);
    expect((table as unknown as { me?: unknown }).me).toBeUndefined();
    const view = getPlayerView(state, 'p1' as PlayerId);
    const serialized = JSON.stringify(view);
    for (const p of state.players) {
      if (p.playerId === 'p1') continue;
      for (const cardId of p.hand) {
        expect(serialized.includes(`"${cardId}"`)).toBe(false);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Inmutabilidad
// ---------------------------------------------------------------------------

describe('inmutabilidad (§3)', () => {
  it('deepFreeze(state) y applyAction no lanza', () => {
    const state = newGame('freeze-1');
    deepFreeze(state);
    const seat0 = state.players.find((p) => p.seat === state.turnSeat)?.playerId as PlayerId;
    expect(() => applyAction(state, seat0, { type: 'bid', amount: 0 }, 0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Propiedad requerida por §9.11: suma de bazas ganadas === roundSize
// ---------------------------------------------------------------------------

describe('propiedad: suma de bazas ganadas === roundSize', () => {
  it('juega rondas completas con jugadas deterministas y comprueba la suma', () => {
    for (let seedNum = 0; seedNum < 8; seedNum++) {
      let state = newGame(`prop-seed-${seedNum}`);
      // Fase de cante: todo el mundo canta 0 (válido salvo enganche; si lo
      // fuera, prueba con 1 en su lugar -- para roundSize=1 en la ronda 1
      // con 4 jugadores el enganche nunca se dispara con cantes 0,0,0 pues
      // forbidden = 1-0 = 1, así que el repartidor cantando 0 es siempre legal).
      while (state.phase === 'bidding') {
        const seat = state.turnSeat;
        expect(seat).not.toBeNull();
        if (seat === null) break;
        const pid = state.players[seat]?.playerId as PlayerId;
        const r = applyAction(state, pid, { type: 'bid', amount: 0 }, 0);
        expect(r.ok).toBe(true);
        if (r.ok) state = r.value.state;
      }

      const roundSize = state.roundSize;
      let guard = 0;
      while (state.status === 'playing' && guard < 1000) {
        guard++;
        const seat = state.turnSeat;
        expect(seat).not.toBeNull();
        if (seat === null) break;
        const player = state.players[seat];
        expect(player).toBeDefined();
        if (!player) break;
        // Juega siempre la primera carta legal de la mano (respeta asistir:
        // solo hace falta comprobar el palo que salió, ya validado por el
        // motor -- aquí probamos con la primera carta y, si el motor la
        // rechaza por MUST_FOLLOW_SUIT, con la primera del palo que salió).
        let played = false;
        for (const cardId of player.hand) {
          const r = applyAction(state, player.playerId, { type: 'playCard', cardId }, 0);
          if (r.ok) {
            state = r.value.state;
            played = true;
            break;
          }
        }
        expect(played).toBe(true);
      }

      expect(state.status).toBe('roundEnd');
      const sumTricks = state.players.reduce((sum, p) => sum + p.tricksWon, 0);
      expect(sumTricks).toBe(roundSize);
    }
  });
});

// ---------------------------------------------------------------------------
// Partida completa: nunca se cuelga, lanza ni termina sin winner
// ---------------------------------------------------------------------------

describe('partida completa', () => {
  it('juega la partida entera (17 rondas con 4 jugadores) hasta gameEnd', () => {
    let state = newGame('full-game-1');
    let roundsPlayed = 0;
    let guard = 0;
    while (state.status !== 'gameEnd' && guard < 5000) {
      guard++;
      if (state.status === 'roundEnd') {
        for (const p of activePlayers(state)) {
          const r = applyAction(state, p.playerId, { type: 'nextRound' }, 0);
          expect(r.ok).toBe(true);
          if (r.ok) state = r.value.state;
        }
        roundsPlayed++;
        continue;
      }
      if (state.phase === 'bidding') {
        const seat = state.turnSeat;
        if (seat === null) break;
        const pid = state.players[seat]?.playerId as PlayerId;
        const r = applyAction(state, pid, { type: 'bid', amount: 0 }, 0);
        if (!r.ok) {
          // enganche: prueba con 1 en su lugar.
          const alt = applyAction(state, pid, { type: 'bid', amount: 1 }, 0);
          expect(alt.ok).toBe(true);
          if (alt.ok) state = alt.value.state;
        } else {
          state = r.value.state;
        }
        continue;
      }
      // phase === 'trick'
      const seat = state.turnSeat;
      if (seat === null) break;
      const player = state.players[seat];
      if (!player) break;
      let played = false;
      for (const cardId of player.hand) {
        const r = applyAction(state, player.playerId, { type: 'playCard', cardId }, 0);
        if (r.ok) {
          state = r.value.state;
          played = true;
          break;
        }
      }
      expect(played).toBe(true);
    }
    expect(state.status).toBe('gameEnd');
    expect(state.winnerId).not.toBeNull();
    expect(roundsPlayed).toBe(totalRounds(4) - 1); // la última ronda pasa directa a gameEnd, sin roundEnd intermedio contado aquí
  });
});
