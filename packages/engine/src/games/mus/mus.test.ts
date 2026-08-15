// Tests del motor de Mus. Los nueve primeros bloques son, uno a uno, los
// casos dorados que §12.13 manda escribir "con estos casos exactos".
import { describe, it, expect } from 'vitest';
import { MusConfigSchema, type GameAction, type MusConfig, type PlayerId } from '@ronda/protocol';
import { createInitialState, applyAction } from './reducer.ts';
import { getPlayerView, getTableView } from './views.ts';
import {
  compareChica,
  compareGrande,
  comparePares,
  juegoPiedras,
  juegoRank,
  juegoSuma,
  paresOf,
  puntoValor,
  tieneJuego,
} from './hand.ts';
import { MUS_META, lanceWinnerSeat, runRecuento } from './recuento.ts';
import { type MusState, teamOfSeat } from './state.ts';
import { buildMusDeck, MUS_DECK_SIZE } from './deck.ts';
import { deepFreeze } from '../../core/freeze.ts';

const DEFAULT_CFG = MusConfigSchema.parse({});

/** Acceso indexado que falla el test en vez de devolver undefined (sin `!`). */
function at<T>(arr: readonly T[], i: number): T {
  const v = arr[i];
  if (v === undefined) throw new Error(`índice fuera de rango: ${i}`);
  return v;
}

/** Desenvuelve algo que el test da por hecho que existe (sin `!`). */
function req<T>(v: T | null | undefined, what: string): T {
  if (v === null || v === undefined) throw new Error(`falta ${what}`);
  return v;
}

const FOUR_PLAYERS = [
  { playerId: 'p0' as PlayerId, nick: 'Ana', seat: 0 },
  { playerId: 'p1' as PlayerId, nick: 'Beto', seat: 1 },
  { playerId: 'p2' as PlayerId, nick: 'Carla', seat: 2 },
  { playerId: 'p3' as PlayerId, nick: 'Dami', seat: 3 },
];

function newGame(seed = 'mus-1', config: MusConfig = DEFAULT_CFG): MusState {
  const waiting = createInitialState({ config, players: FOUR_PLAYERS, seed, roomCode: 'TEST' });
  return apply(waiting, 3, { type: 'repartir' });
}

function waitingForDeal(seed = 'mus-1', config: MusConfig = DEFAULT_CFG): MusState {
  return createInitialState({ config, players: FOUR_PLAYERS, seed, roomCode: 'TEST' });
}

/**
 * Estado con manos fijadas a mano. Los casos dorados hablan de cartas
 * concretas, no de semillas: repartir y esperar a que salgan sería un test
 * distinto (y frágil).
 */
function withHands(hands: string[][], config: MusConfig = DEFAULT_CFG, seed = 'mus-1'): MusState {
  const s = newGame(seed, config);
  return {
    ...s,
    players: s.players.map((p, i) => ({ ...p, hand: [...(hands[i] ?? p.hand)] })),
  };
}

/** Aplica una acción y devuelve el estado nuevo, fallando el test si da error. */
function apply(state: MusState, playerIndex: number, action: GameAction): MusState {
  const r = applyAction(state, `p${playerIndex}`, action, 0);
  if (!r.ok) throw new Error(`acción rechazada: ${r.code} (${action.type}, p${playerIndex})`);
  return r.value.state;
}

/** Asiento al que le toca hablar. */
function turn(state: MusState): number {
  if (state.turnSeat === null) throw new Error('no hay turno');
  return state.turnSeat;
}

// ---------------------------------------------------------------------------
// Golden test 1 (§12.13.1): Grande, comparación carta a carta
// ---------------------------------------------------------------------------

describe('§12.13.1 — Grande, carta a carta', () => {
  it('[Rey, Rey, Caballo, As] gana a [Rey, Rey, Sota, Sota]', () => {
    const a = ['oros-12', 'copas-12', 'espadas-11', 'bastos-1'];
    const b = ['espadas-12', 'bastos-12', 'oros-10', 'copas-10'];
    // Empatan los dos Reyes; el Caballo supera a la Sota.
    expect(compareGrande(a, b, true)).toBeGreaterThan(0);
    expect(compareGrande(b, a, true)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Golden test 2 (§12.13.2): ocho reyes
// ---------------------------------------------------------------------------

describe('§12.13.2 — ocho reyes', () => {
  const conTres = ['oros-3', 'copas-12', 'espadas-10', 'bastos-1'];
  const conRey = ['oros-12', 'copas-12', 'espadas-10', 'bastos-1'];

  it('con ochoReyes, [Tres, Rey, Sota, As] equivale a [Rey, Rey, Sota, As]', () => {
    expect(compareGrande(conTres, conRey, true)).toBe(0);
  });

  it('sin ochoReyes, el Tres queda por debajo de la Sota y la mano vale menos', () => {
    expect(compareGrande(conTres, conRey, false)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Golden test 3 (§12.13.3): Chica
// ---------------------------------------------------------------------------

describe('§12.13.3 — Chica', () => {
  it('[As, Dos, Rey, Caballo] gana a [As, Cuatro, Rey, Rey] con ochoReyes', () => {
    const a = ['oros-1', 'copas-2', 'espadas-12', 'bastos-11'];
    const b = ['espadas-1', 'bastos-4', 'oros-12', 'copas-12'];
    // Empatan los Ases; el Dos vale como As, más bajo que el Cuatro.
    expect(compareChica(a, b, true)).toBeGreaterThan(0);
    expect(compareChica(b, a, true)).toBeLessThan(0);
  });
});

// ---------------------------------------------------------------------------
// Golden test 4 (§12.13.4): Pares
// ---------------------------------------------------------------------------

describe('§12.13.4 — Pares', () => {
  const duples = ['oros-12', 'copas-12', 'espadas-10', 'bastos-10'];
  const medias = ['espadas-12', 'bastos-12', 'oros-11', 'oros-1'];

  it('duples gana a medias', () => {
    const pa = paresOf(duples, true);
    const pb = paresOf(['oros-12', 'copas-12', 'espadas-12', 'bastos-1'], true);
    expect(pa?.kind).toBe('duples');
    expect(pb?.kind).toBe('medias');
    expect(comparePares(req(pa, 'duples'), req(pb, 'medias'))).toBeGreaterThan(0);
  });

  it('duples paga 3 piedras y medias 2', () => {
    expect(paresOf(duples, true)?.piedras).toBe(3);
    expect(paresOf(['oros-12', 'copas-12', 'espadas-12', 'bastos-1'], true)?.piedras).toBe(2);
    expect(paresOf(medias, true)?.kind).toBe('pareja');
  });

  it('con ochoReyes, Rey y Tres hacen pareja, y As y Dos también', () => {
    const reyTres = ['oros-12', 'copas-3', 'espadas-1', 'bastos-2'];
    const p = paresOf(reyTres, true);
    expect(p?.kind).toBe('duples'); // pareja de reyes + pareja de ases
    expect(paresOf(reyTres, false)).toBeNull(); // sin la variante son cuatro cartas distintas
  });

  it('cuatro iguales son duples y se comparan como dos parejas de esa carta', () => {
    const cuatroReyes = ['oros-12', 'copas-12', 'espadas-12', 'bastos-12'];
    const p = paresOf(cuatroReyes, true);
    expect(p?.kind).toBe('duples');
    expect(
      comparePares(req(p, 'cuatro reyes'), req(paresOf(duples, true), 'duples')),
    ).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Golden test 5 (§12.13.5): Juego
// ---------------------------------------------------------------------------

describe('§12.13.5 — Juego', () => {
  const treintaYUno = ['oros-12', 'copas-11', 'espadas-10', 'bastos-1'];
  const cuarenta = ['espadas-12', 'bastos-12', 'oros-11', 'copas-10'];

  it('[Rey, Caballo, Sota, As] suma 31 y [Rey, Rey, Caballo, Sota] suma 40', () => {
    expect(juegoSuma(treintaYUno)).toBe(31);
    expect(juegoSuma(cuarenta)).toBe(40);
  });

  it('el 31 gana al 40', () => {
    expect(juegoRank(31)).toBeGreaterThan(juegoRank(40));
  });

  it('el 31 paga 3 piedras y el resto 2', () => {
    expect(juegoPiedras(31)).toBe(3);
    expect(juegoPiedras(40)).toBe(2);
    expect(juegoPiedras(33)).toBe(2);
  });

  it('el orden completo del contrato es 31, 32, 40, 37, 36, 35, 34, 33', () => {
    const orden = [31, 32, 40, 37, 36, 35, 34, 33];
    const ranks = orden.map(juegoRank);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    expect(new Set(ranks).size).toBe(orden.length);
  });

  it('el Tres suma 3 y el Dos suma 2 aunque ochoReyes esté activo', () => {
    // Decisión de Unai al cerrar §12.6: sota, rey y caballo cuentan 10 y el
    // resto igual a su número. La variante solo cambia Grande y Chica.
    expect(juegoSuma(['oros-3', 'copas-12', 'espadas-12', 'bastos-12'])).toBe(33);
    expect(juegoSuma(['oros-2', 'copas-12', 'espadas-12', 'bastos-12'])).toBe(32);
  });
});

// ---------------------------------------------------------------------------
// Golden test 6 (§12.13.6): Punto
// ---------------------------------------------------------------------------

describe('§12.13.6 — Punto', () => {
  const a = ['oros-12', 'copas-10', 'espadas-7', 'bastos-1'];
  const b = ['espadas-11', 'bastos-10', 'oros-6', 'copas-1'];

  it('28 gana a 27 y ninguna llega a 31', () => {
    expect(puntoValor(a)).toBe(28);
    expect(puntoValor(b)).toBe(27);
    expect(tieneJuego(28)).toBe(false);
    expect(tieneJuego(27)).toBe(false);
  });

  it('paga config.puntoVale', () => {
    expect(DEFAULT_CFG.puntoVale).toBe(1);
    expect(MusConfigSchema.parse({ puntoVale: 2 }).puntoVale).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Golden test 7 (§12.13.7): empate y mano
// ---------------------------------------------------------------------------

describe('§12.13.7 — empate: gana quien esté antes contando desde el mano', () => {
  // Los asientos 1 y 3 tienen manos idénticas a efectos de Grande.
  const hands = [
    ['oros-4', 'copas-4', 'espadas-4', 'bastos-4'], // asiento 0, la peor
    ['oros-12', 'copas-12', 'oros-11', 'oros-10'], // asiento 1
    ['oros-5', 'copas-5', 'espadas-5', 'bastos-5'], // asiento 2
    ['espadas-12', 'bastos-12', 'copas-11', 'copas-10'], // asiento 3, igual que el 1
  ];

  it('con el mano en el asiento 0, gana el asiento 1', () => {
    const s = withHands(hands);
    expect(compareGrande(at(hands, 1), at(hands, 3), true)).toBe(0);
    expect(lanceWinnerSeat(s, 'grande', [0, 1, 2, 3])).toBe(1);
  });

  it('con el mano en el asiento 2, gana el asiento 3', () => {
    const s: MusState = { ...withHands(hands), manoSeat: 2 };
    expect(lanceWinnerSeat(s, 'grande', [2, 3, 0, 1])).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Golden test 8 (§12.13.8): órdago querido
// ---------------------------------------------------------------------------

describe('§12.13.8 — órdago querido', () => {
  // El asiento 1 (pareja 1) tiene la mejor Grande con diferencia.
  const hands = [
    ['oros-4', 'copas-4', 'espadas-4', 'bastos-4'],
    ['oros-12', 'copas-12', 'espadas-12', 'bastos-12'],
    ['oros-5', 'copas-5', 'espadas-5', 'bastos-5'],
    ['oros-6', 'copas-6', 'espadas-6', 'bastos-6'],
  ];

  function hastaElOrdago(): MusState {
    let s = withHands(hands);
    s = apply(s, 0, { type: 'noMus' }); // el mano corta: empieza Grande
    expect(s.lance).toBe('grande');
    s = apply(s, 0, { type: 'paso' });
    s = apply(s, 1, { type: 'ordago' });
    return s;
  }

  it('responde la pareja contraria, no el compañero de quien lo echó', () => {
    const s = hastaElOrdago();
    expect(turn(s)).toBe(2);
    expect(teamOfSeat(2)).not.toBe(s.bet?.byTeam);
    // El compañero (asiento 3) no puede responder aunque lo intente.
    const r = applyAction(s, 'p3', { type: 'querer' }, 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe('NOT_YOUR_TURN');
  });

  it('querido: se resuelve solo ese lance y la pareja ganadora gana el juego entero', () => {
    const s = apply(hastaElOrdago(), 2, { type: 'querer' });

    expect(s.handResult?.byOrdago).toBe(true);
    expect(s.handResult?.juegoWonByTeam).toBe(1);
    expect(s.piedras[1]).toBe(MUS_META);
    expect(s.piedras[0]).toBe(0); // el tanteo previo da igual (§12.8)
    // Con config.juegos = 1, ganar el juego es ganar la partida.
    expect(s.status).toBe('gameEnd');
    expect(s.winnerTeamIndex).toBe(1);
    // Las cartas de los cuatro quedan descubiertas.
    expect(s.handResult?.hands).toEqual(hands);
  });

  it('no querido: 1 piedra a quien lo echó y la mano sigue', () => {
    const s = apply(hastaElOrdago(), 2, { type: 'noQuerer' });
    expect(s.piedras[1]).toBe(1);
    expect(s.status).toBe('playing');
    expect(s.lance).toBe('chica'); // el lance siguiente
  });

  it('sobre un órdago no se puede subir: solo querer o no querer', () => {
    const s = hastaElOrdago();
    for (const action of [{ type: 'envidar', piedras: 5 }, { type: 'ordago' }] as const) {
      const r = applyAction(s, 'p2', action, 0);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.code).toBe('INVALID_ACTION');
    }
  });
});

// ---------------------------------------------------------------------------
// Golden test 9 (§12.13.9): corte del recuento
// ---------------------------------------------------------------------------

describe('§12.13.9 — el recuento se corta al llegar a 40', () => {
  // El asiento 0 (pareja 0) gana Grande de calle y además tiene medias.
  const hands = [
    ['oros-12', 'copas-12', 'espadas-12', 'bastos-1'], // medias de reyes, y suma 31
    ['oros-1', 'copas-4', 'espadas-5', 'bastos-6'], // la Chica más baja
    ['copas-5', 'espadas-6', 'bastos-7', 'oros-4'],
    ['espadas-4', 'bastos-5', 'oros-6', 'copas-7'],
  ];

  /** Juega la mano entera en paso y con las declaraciones que tocan. */
  function manoEnPaso(piedrasIniciales: number[]): MusState {
    let s: MusState = { ...withHands(hands), piedras: [...piedrasIniciales] };
    s = apply(s, 0, { type: 'noMus' });

    // Grande y Chica: pasan los cuatro.
    for (const lance of ['grande', 'chica'] as const) {
      expect(s.lance).toBe(lance);
      for (let i = 0; i < 4; i++) s = apply(s, turn(s), { type: 'paso' });
    }

    // Declaraciones: solo el asiento 0 tiene pares, y solo él tiene juego (31).
    expect(s.phase).toBe('declararPares');
    for (let i = 0; i < 4; i++)
      s = apply(s, turn(s), { type: 'declararPares', tiene: turn(s) === 0 });
    expect(s.phase).toBe('declararJuego');
    for (let i = 0; i < 4; i++)
      s = apply(s, turn(s), { type: 'declararJuego', tiene: turn(s) === 0 });

    return s;
  }

  it('39 + la piedra de Grande = 40: las piedras de medias ya no se cuentan', () => {
    // §12.13.9 dice "38", pero 38 + 1 son 39: el caso solo llega a 40 partiendo
    // de 39. Se implementa la intención (el recuento para) con la aritmética
    // correcta.
    const s = manoEnPaso([39, 0]);

    expect(s.piedras[0]).toBe(MUS_META);
    const rows = s.handResult?.rows ?? [];
    const grande = rows.find((r) => r.lance === 'grande');
    const pares = rows.find((r) => r.lance === 'pares');

    expect(grande?.counted).toBe(true);
    expect(grande?.piedras).toBe(1); // "en paso" vale 1 (§12.7)
    expect(grande?.wonByTeam).toBe(0);

    expect(pares?.counted).toBe(false);
    expect(pares?.tablas).toEqual([0, 0]); // las 2 piedras de medias no entran
    expect(s.status).toBe('gameEnd');
    expect(s.winnerTeamIndex).toBe(0);
  });

  it('sin el corte, la misma mano sí apunta las medias y el juego', () => {
    const s = manoEnPaso([0, 0]);
    const rows = s.handResult?.rows ?? [];

    // Grande y Chica en paso: 1 piedra cada una. La pareja 0 gana Grande
    // (tres reyes) y la 1 gana Chica.
    expect(rows.find((r) => r.lance === 'grande')?.wonByTeam).toBe(0);
    expect(rows.find((r) => r.lance === 'chica')?.wonByTeam).toBe(1);

    // Solo la pareja 0 tiene pares y juego: se lo lleva sin comparación (§12.7).
    const pares = rows.find((r) => r.lance === 'pares');
    expect(pares?.outcome).toBe('soloUna');
    expect(pares?.piedras).toBe(1);
    expect(pares?.tablas).toEqual([2, 0]); // medias

    const juego = rows.find((r) => r.lance === 'juego');
    expect(juego?.outcome).toBe('soloUna');
    expect(juego?.tablas).toEqual([3, 0]); // el 31 paga 3

    // 1 (grande) + 1 (pares soloUna) + 2 (medias) + 1 (juego soloUna) + 3 (31)
    expect(s.piedras[0]).toBe(8);
    expect(s.piedras[1]).toBe(1); // solo la piedra de Chica
    expect(s.status).toBe('roundEnd');
  });
});

// ---------------------------------------------------------------------------
// Fase de mus y descarte (§12.5)
// ---------------------------------------------------------------------------

describe('reparto por el postre (§12.4)', () => {
  it('empieza sin cartas y solo el postre puede repartir', () => {
    const s = waitingForDeal();
    expect(s.phase).toBe('reparto');
    expect(s.manoSeat).toBe(0);
    expect(s.turnSeat).toBe(3);
    expect(s.players.map((p) => p.hand.length)).toEqual([0, 0, 0, 0]);
    expect(getTableView(s).postreSeat).toBe(3);
    expect(getPlayerView(s, 'p3').me.availableActions).toContain('repartir');
    expect(getPlayerView(s, 'p0').me.availableActions).not.toContain('repartir');
    expect(applyAction(s, 'p0', { type: 'repartir' }, 0)).toMatchObject({
      ok: false,
      code: 'NOT_YOUR_TURN',
    });
  });

  it('al repartir sirve cuatro cartas y da la palabra al mano', () => {
    const s = newGame();
    expect(s.players.map((p) => p.hand.length)).toEqual([4, 4, 4, 4]);
    expect(s.phase).toBe('mus');
    expect(s.turnSeat).toBe(s.manoSeat);
  });
});

describe('fase de mus y descarte (§12.5)', () => {
  it('el reparto no repite cartas', () => {
    const s = newGame();
    const todas = s.players.flatMap((p) => p.hand);
    expect(new Set(todas).size).toBe(16); // sin repetidas
  });

  it('si los cuatro dicen mus, se pasa al descarte', () => {
    let s = newGame();
    for (let i = 0; i < 4; i++) s = apply(s, turn(s), { type: 'mus' });
    expect(s.phase).toBe('descarte');
    expect(s.turnSeat).toBe(s.manoSeat);
  });

  it('en cuanto uno corta, se acabó el mus y empieza Grande', () => {
    let s = newGame();
    s = apply(s, turn(s), { type: 'mus' });
    s = apply(s, turn(s), { type: 'noMus' });
    expect(s.phase).toBe('lance');
    expect(s.lance).toBe('grande');
    expect(s.turnSeat).toBe(s.manoSeat); // en el lance vuelve a hablar el mano
  });

  it('el descarte es de 1 a 4 cartas, nunca 0, y se roban las mismas', () => {
    let s = newGame();
    for (let i = 0; i < 4; i++) s = apply(s, turn(s), { type: 'mus' });

    const seat = turn(s);
    const antes = at(s.players, seat).hand;

    expect(applyAction(s, `p${seat}`, { type: 'descartar', cardIds: [] }, 0)).toMatchObject({
      ok: false,
      code: 'MUST_DISCARD_AT_LEAST_ONE',
    });
    expect(
      applyAction(s, `p${seat}`, { type: 'descartar', cardIds: [...antes, at(antes, 0)] }, 0),
    ).toMatchObject({ ok: false, code: 'MUST_DISCARD_AT_LEAST_ONE' });
    expect(
      applyAction(s, `p${seat}`, { type: 'descartar', cardIds: ['oros-1', 'oros-1'] }, 0),
    ).toMatchObject({ ok: false });

    s = apply(s, seat, { type: 'descartar', cardIds: [at(antes, 0), at(antes, 1)] });
    const despues = at(s.players, seat).hand;
    expect(despues).toHaveLength(4);
    expect(despues).not.toContain(at(antes, 0));
    expect(s.discardPile).toContain(at(antes, 0));
  });

  it('cuando los cuatro han descartado, vuelve a empezar la vuelta de mus', () => {
    let s = newGame();
    for (let i = 0; i < 4; i++) s = apply(s, turn(s), { type: 'mus' });
    for (let i = 0; i < 4; i++) {
      const seat = turn(s);
      s = apply(s, seat, { type: 'descartar', cardIds: [at(at(s.players, seat).hand, 0)] });
    }
    expect(s.phase).toBe('mus');
    expect(s.players.map((p) => p.musSaid)).toEqual([null, null, null, null]);
    expect(s.players.map((p) => p.hand.length)).toEqual([4, 4, 4, 4]);
  });

  it('no se puede pedir mus fuera de la fase de mus', () => {
    let s = newGame();
    s = apply(s, turn(s), { type: 'noMus' });
    expect(applyAction(s, 'p1', { type: 'mus' }, 0)).toMatchObject({
      ok: false,
      code: 'NOT_IN_MUS_PHASE',
    });
  });
});

// ---------------------------------------------------------------------------
// Declaraciones (§12.6.3, §12.6.4)
// ---------------------------------------------------------------------------

describe('declaraciones de pares y juego (§12.6)', () => {
  const hands = [
    ['oros-12', 'copas-12', 'espadas-10', 'bastos-1'], // pares (reyes), suma 31
    ['oros-4', 'copas-5', 'espadas-6', 'bastos-7'], // ni pares ni juego (22)
    ['copas-4', 'espadas-5', 'bastos-6', 'oros-7'],
    ['espadas-4', 'bastos-5', 'oros-6', 'copas-7'],
  ];

  function hastaDeclararPares(): MusState {
    let s = withHands(hands);
    s = apply(s, 0, { type: 'noMus' });
    for (const _lance of ['grande', 'chica']) {
      for (let i = 0; i < 4; i++) s = apply(s, turn(s), { type: 'paso' });
    }
    return s;
  }

  it('mentir en la declaración se rechaza: la verdad está en las cartas', () => {
    const s = hastaDeclararPares();
    expect(s.phase).toBe('declararPares');
    expect(applyAction(s, 'p0', { type: 'declararPares', tiene: false }, 0)).toMatchObject({
      ok: false,
      code: 'FALSE_DECLARATION',
    });
    const conPares = apply(s, 0, { type: 'declararPares', tiene: true });
    expect(applyAction(conPares, 'p1', { type: 'declararPares', tiene: true }, 0)).toMatchObject({
      ok: false,
      code: 'FALSE_DECLARATION',
    });
  });

  it('si nadie tiene juego, el lance se sustituye por el punto', () => {
    // Manos sin juego para nadie: se quita el 31 del asiento 0.
    const sinJuego = [['oros-12', 'copas-12', 'espadas-2', 'bastos-3'], ...hands.slice(1)];
    let s = withHands(sinJuego);
    s = apply(s, 0, { type: 'noMus' });
    for (const _lance of ['grande', 'chica']) {
      for (let i = 0; i < 4; i++) s = apply(s, turn(s), { type: 'paso' });
    }
    for (let i = 0; i < 4; i++)
      s = apply(s, turn(s), { type: 'declararPares', tiene: turn(s) === 0 });
    for (let i = 0; i < 4; i++) s = apply(s, turn(s), { type: 'declararJuego', tiene: false });
    expect(s.lance).toBe('punto');
  });

  it('solo ofrece envite en pares a quien ha declarado que tiene', () => {
    let s = withHands([
      ['oros-12', 'copas-12', 'espadas-10', 'bastos-1'],
      ['oros-11', 'copas-11', 'espadas-6', 'bastos-2'],
      ['oros-4', 'copas-5', 'espadas-6', 'bastos-7'],
      ['copas-4', 'espadas-5', 'bastos-6', 'oros-7'],
    ]);
    s = apply(s, 0, { type: 'noMus' });
    for (const _lance of ['grande', 'chica']) {
      for (let i = 0; i < 4; i++) s = apply(s, turn(s), { type: 'paso' });
    }
    for (let i = 0; i < 4; i++) {
      const seat = turn(s);
      s = apply(s, seat, { type: 'declararPares', tiene: seat === 0 || seat === 1 });
    }

    expect(s.lance).toBe('pares');
    expect(getPlayerView(s, 'p0').me.availableActions).toContain('envidar');

    const turnoSinPares: MusState = { ...s, turnSeat: 2 };
    expect(getPlayerView(turnoSinPares, 'p2').me.availableActions).not.toContain('envidar');
    expect(getPlayerView(turnoSinPares, 'p2').me.availableActions).not.toContain('ordago');
  });
});

// ---------------------------------------------------------------------------
// Envites (§12.7)
// ---------------------------------------------------------------------------

describe('envites (§12.7)', () => {
  const hands = [
    ['oros-12', 'copas-11', 'espadas-7', 'bastos-4'],
    ['oros-10', 'copas-6', 'espadas-5', 'bastos-2'],
    ['copas-12', 'espadas-11', 'bastos-7', 'oros-4'],
    ['copas-10', 'espadas-6', 'bastos-5', 'oros-2'],
  ];

  function enGrande(): MusState {
    return apply(withHands(hands), 0, { type: 'noMus' });
  }

  it('el envite mínimo es 2', () => {
    const s = enGrande();
    expect(applyAction(s, 'p0', { type: 'envidar', piedras: 1 }, 0)).toMatchObject({
      ok: false,
      code: 'BET_TOO_LOW',
    });
    expect(apply(s, 0, { type: 'envidar', piedras: 2 }).bet?.piedras).toBe(2);
  });

  it('subir tiene que superar lo apostado, y responde la pareja contraria', () => {
    let s = apply(enGrande(), 0, { type: 'envidar', piedras: 3 });
    expect(turn(s)).toBe(1);
    expect(applyAction(s, 'p1', { type: 'envidar', piedras: 3 }, 0)).toMatchObject({
      ok: false,
      code: 'BET_TOO_LOW',
    });
    s = apply(s, 1, { type: 'envidar', piedras: 5 });
    expect(s.bet).toMatchObject({ piedras: 5, byTeam: 1, ifRejected: 3 });
    expect(turn(s)).toBe(2); // vuelve a la pareja 0
  });

  it('el compañero de quien envidó no puede subir hasta que responda la contraria', () => {
    const s = apply(enGrande(), 0, { type: 'envidar', piedras: 3 });
    // El asiento 2 es compañero del 0. No es su turno, y aunque lo fuera sería
    // de la pareja que envidó.
    expect(applyAction(s, 'p2', { type: 'envidar', piedras: 4 }, 0)).toMatchObject({
      ok: false,
      code: 'NOT_YOUR_TURN',
    });
  });

  it('no querer paga en el acto lo acumulado antes del último envite', () => {
    let s = apply(enGrande(), 0, { type: 'envidar', piedras: 3 });
    s = apply(s, 1, { type: 'noQuerer' });
    expect(s.piedras[0]).toBe(1); // no había nada antes: 1 piedra
    expect(s.lance).toBe('chica');

    let t = apply(enGrande(), 0, { type: 'envidar', piedras: 3 });
    t = apply(t, 1, { type: 'envidar', piedras: 6 });
    t = apply(t, 2, { type: 'noQuerer' });
    expect(t.piedras[1]).toBe(3); // lo apostado antes del último envite
  });

  it('querer deja el lance para el recuento', () => {
    let s = apply(enGrande(), 0, { type: 'envidar', piedras: 4 });
    s = apply(s, 1, { type: 'querer' });
    expect(s.piedras).toEqual([0, 0]); // todavía nada: se compara al final
    expect(s.lances[0]).toMatchObject({ lance: 'grande', outcome: 'querido', piedras: 4 });
    expect(s.lance).toBe('chica');
  });

  it('con un envite sobre la mesa no se puede pasar', () => {
    const s = apply(enGrande(), 0, { type: 'envidar', piedras: 2 });
    expect(applyAction(s, 'p1', { type: 'paso' }, 0)).toMatchObject({
      ok: false,
      code: 'INVALID_ACTION',
    });
  });

  it('en pares solo envida quien ha declarado que tiene', () => {
    // Solo los asientos 0 y 1 tienen pares: hay una pareja de cada bando.
    const conPares = [
      ['oros-12', 'copas-12', 'espadas-7', 'bastos-4'],
      ['oros-10', 'copas-10', 'espadas-5', 'bastos-2'],
      ['espadas-12', 'bastos-11', 'oros-6', 'copas-4'],
      ['copas-11', 'espadas-10', 'bastos-6', 'oros-2'],
    ];
    let s = withHands(conPares);
    s = apply(s, 0, { type: 'noMus' });
    for (const _lance of ['grande', 'chica']) {
      for (let i = 0; i < 4; i++) s = apply(s, turn(s), { type: 'paso' });
    }
    for (let i = 0; i < 4; i++) {
      const seat = turn(s);
      s = apply(s, seat, { type: 'declararPares', tiene: seat === 0 || seat === 1 });
    }
    expect(s.lance).toBe('pares');
    expect(turn(s)).toBe(0);
    // El turno solo pasa por quienes tienen pares.
    s = apply(s, 0, { type: 'paso' });
    expect(turn(s)).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Marcador por parejas, juegos y rotación del mano (§12.2, §12.3, §12.4)
// ---------------------------------------------------------------------------

describe('parejas, juegos y mano (§12.2-§12.4)', () => {
  it('los asientos 0 y 2 son una pareja, y 1 y 3 la otra', () => {
    const s = newGame();
    expect(s.players.map((p) => p.teamIndex)).toEqual([0, 1, 0, 1]);
  });

  it('createInitialState exige exactamente 4 jugadores', () => {
    expect(() =>
      createInitialState({ config: DEFAULT_CFG, players: FOUR_PLAYERS.slice(0, 3), seed: 'x' }),
    ).toThrow();
  });

  it('el mano rota y el nuevo postre confirma el reparto siguiente', () => {
    let s: MusState = { ...newGame(), status: 'roundEnd', handResult: null };
    expect(s.manoSeat).toBe(0);
    for (let i = 0; i < 4; i++) s = apply(s, i, { type: 'nextRound' });
    expect(s.manoSeat).toBe(1);
    expect(s.handNumber).toBe(2);
    expect(s.status).toBe('playing');
    expect(s.phase).toBe('reparto');
    expect(s.turnSeat).toBe(0);
    expect(s.players.map((p) => p.hand.length)).toEqual([0, 0, 0, 0]);
    s = apply(s, 0, { type: 'repartir' });
    expect(s.phase).toBe('mus');
    expect(s.turnSeat).toBe(1);
  });

  it('con juegos > 1, ganar un juego reinicia las piedras y no acaba la partida', () => {
    const cfg = MusConfigSchema.parse({ juegos: 2 });
    const hands = [
      ['oros-12', 'copas-12', 'espadas-12', 'bastos-12'],
      ['oros-4', 'copas-4', 'espadas-4', 'bastos-4'],
      ['oros-5', 'copas-5', 'espadas-5', 'bastos-5'],
      ['oros-6', 'copas-6', 'espadas-6', 'bastos-6'],
    ];
    let s = withHands(hands, cfg);
    s = apply(s, 0, { type: 'noMus' });
    s = apply(s, 0, { type: 'ordago' });
    s = apply(s, 1, { type: 'querer' });

    expect(s.piedras[0]).toBe(MUS_META);
    expect(s.juegosWon).toEqual([1, 0]);
    expect(s.status).toBe('roundEnd'); // falta un juego para la partida
    expect(s.winnerTeamIndex).toBeNull();

    for (let i = 0; i < 4; i++) s = apply(s, i, { type: 'nextRound' });
    expect(s.piedras).toEqual([0, 0]); // juego nuevo, piedras a cero (§12.3)
    expect(s.juegoNumber).toBe(2);
    expect(s.handNumber).toBe(1);
    expect(s.phase).toBe('reparto');
  });
});

// ---------------------------------------------------------------------------
// Requisitos del motor (§3)
// ---------------------------------------------------------------------------

describe('requisitos del motor (§3)', () => {
  it('la baraja es la española de 40 cartas, sin comodines', () => {
    const deck = buildMusDeck();
    expect(deck).toHaveLength(MUS_DECK_SIZE);
    // P31: que no haya ochos, nueves ni comodines lo garantiza ya el tipo
    // `Rank`, así que se comprueba por id -- que es lo que viaja por el socket.
    const noIds = ['oros-8', 'oros-9', 'joker-1', 'joker-2'];
    for (const bad of noIds) expect(deck.some((c) => c.id === bad)).toBe(false);
  });

  it('es determinista: misma semilla, mismo reparto', () => {
    expect(newGame('semilla-x').players.map((p) => p.hand)).toEqual(
      newGame('semilla-x').players.map((p) => p.hand),
    );
    expect(newGame('semilla-x').players.map((p) => p.hand)).not.toEqual(
      newGame('semilla-y').players.map((p) => p.hand),
    );
  });

  it('el estado es JSON-serializable y sobrevive al viaje de ida y vuelta', () => {
    const s = apply(newGame(), 0, { type: 'noMus' });
    expect(JSON.parse(JSON.stringify(s))).toEqual(s);
  });

  it('applyAction no muta el estado que recibe', () => {
    const s = deepFreeze(newGame());
    expect(() => applyAction(s, 'p0', { type: 'noMus' }, 0)).not.toThrow();
    expect(s.phase).toBe('mus');
  });

  it('rechaza el vocabulario de los otros juegos', () => {
    const s = newGame();
    for (const action of [{ type: 'drawDeck' }, { type: 'bid', amount: 1 }] as const) {
      expect(applyAction(s, 'p0', action, 0)).toMatchObject({ ok: false, code: 'INVALID_ACTION' });
    }
  });
});

// ---------------------------------------------------------------------------
// Censura de vistas (§2.5)
// ---------------------------------------------------------------------------

describe('vistas censuradas (§2.5)', () => {
  it('la vista de mesa no filtra la mano de nadie mientras se juega', () => {
    const s = apply(newGame(), 0, { type: 'noMus' });
    const json = JSON.stringify(getTableView(s));
    for (const p of s.players) {
      for (const card of p.hand) expect(json).not.toContain(card);
    }
  });

  it('la vista de un jugador solo lleva su propia mano', () => {
    const s = apply(newGame(), 0, { type: 'noMus' });
    const view = getPlayerView(s, 'p0');
    expect(view.me.hand).toEqual(at(s.players, 0).hand);
    const json = JSON.stringify(view);
    for (const p of s.players.slice(1)) {
      for (const card of p.hand) expect(json).not.toContain(card);
    }
  });

  it('el marcador va por parejas: winnerId siempre null y score siempre 0', () => {
    const s = newGame();
    const view = getTableView(s);
    expect(view.winnerId).toBeNull();
    expect(view.players.map((p) => p.score)).toEqual([0, 0, 0, 0]);
    expect(view.players.map((p) => p.teamIndex)).toEqual([0, 1, 0, 1]);
    expect(view.teams).toHaveLength(2);
  });

  it('los amarrakos son las piedras entre 5', () => {
    const s: MusState = { ...newGame(), piedras: [12, 40] };
    const teams = getTableView(s).teams;
    expect(teams[0]).toMatchObject({ piedras: 12, amarrakos: 2 });
    expect(teams[1]).toMatchObject({ piedras: 40, amarrakos: 8 });
  });

  it('tras el recuento sí se ven las cuatro manos: se han descubierto (§12.9)', () => {
    const hands = [
      ['oros-12', 'copas-12', 'espadas-12', 'bastos-12'],
      ['oros-4', 'copas-4', 'espadas-4', 'bastos-4'],
      ['oros-5', 'copas-5', 'espadas-5', 'bastos-5'],
      ['oros-6', 'copas-6', 'espadas-6', 'bastos-6'],
    ];
    let s = withHands(hands);
    s = apply(s, 0, { type: 'noMus' });
    s = apply(s, 0, { type: 'ordago' });
    s = apply(s, 1, { type: 'querer' });
    expect(getTableView(s).handResult?.hands).toEqual(hands);
  });
});

// ---------------------------------------------------------------------------
// Recuento: cada pareja cobra sus tablas (§12.9.2)
// ---------------------------------------------------------------------------

describe('recuento: las tablas las cobra cada pareja (§12.9.2)', () => {
  it('duples de una pareja y medias de la otra: 3 frente a 2', () => {
    const s: MusState = {
      ...withHands([
        ['oros-12', 'copas-12', 'espadas-10', 'bastos-10'], // duples
        ['espadas-12', 'bastos-12', 'oros-11', 'copas-1'], // medias no: pareja de reyes
        ['oros-4', 'copas-5', 'espadas-6', 'bastos-7'],
        ['copas-4', 'espadas-5', 'bastos-6', 'oros-7'],
      ]),
      lances: [{ lance: 'pares', outcome: 'querido', piedras: 2, team: null, paid: false }],
    };
    at(s.players, 0).paresDeclared = true;
    at(s.players, 1).paresDeclared = true;
    at(s.players, 2).paresDeclared = false;
    at(s.players, 3).paresDeclared = false;

    const result = runRecuento(s);
    const row = at(result.rows, 0);
    expect(row.wonByTeam).toBe(0); // duples gana a pareja
    expect(row.piedras).toBe(2); // el envite querido
    expect(row.tablas).toEqual([3, 1]); // cada pareja cobra lo suyo
    expect(s.piedras).toEqual([5, 1]);
  });
});
