// Pruebas tácticas y de legalidad de las estrategias competitivas.
import { describe, it, expect } from 'vitest';
import { decideMusAction, decidePochaAction } from './bot-policy.ts';
import {
  DEFAULT_MUS_CONFIG,
  DEFAULT_POCHA_CONFIG,
  type MusAvailableAction,
  type MusPlayerView,
  type PochaPlayerView,
} from '@ronda/protocol';

function baseView(overrides: Partial<PochaPlayerView> = {}): PochaPlayerView {
  return {
    kind: 'player',
    roomCode: 'AAAA',
    gameId: 'pocha',
    config: DEFAULT_POCHA_CONFIG,
    status: 'playing',
    round: 1,
    players: [
      {
        playerId: 'p0',
        nick: 'A',
        seat: 0,
        colorIndex: 0,
        score: 0,
        handCount: 4,
        connected: true,
        isHost: true,
        eliminated: false,
        teamIndex: null,
      },
      {
        playerId: 'p1',
        nick: 'B',
        seat: 1,
        colorIndex: 1,
        score: 0,
        handCount: 4,
        connected: true,
        isHost: false,
        eliminated: false,
        teamIndex: null,
      },
      {
        playerId: 'p2',
        nick: 'C',
        seat: 2,
        colorIndex: 2,
        score: 0,
        handCount: 4,
        connected: true,
        isHost: false,
        eliminated: false,
        teamIndex: null,
      },
    ],
    turnPlayerId: 'p2',
    winnerId: null,
    rematchVotes: [],
    trumpSuit: null,
    trumpCardId: null,
    roundSize: 4,
    dealerSeat: 2,
    bids: [1, 1, null],
    tricksWon: [0, 0, 0],
    currentTrick: [],
    leadSuit: null,
    roundResult: null,
    me: {
      playerId: 'p2',
      hand: ['bastos-12', 'oros-10', 'copas-3', 'espadas-4'],
      legalCardIds: [],
      availableActions: ['bid'],
    },
    ...overrides,
  };
}

describe('decidePochaAction', () => {
  it('nunca elige el valor prohibido por el enganche siendo repartidor', () => {
    // Cante estimado por la heurística (2 cartas de rango >= 10) coincide
    // con el valor prohibido: forbidden = roundSize(4) - (1+1) = 2.
    const view = baseView();
    const action = decidePochaAction(view);
    expect(action?.type).toBe('bid');
    if (action?.type !== 'bid') throw new Error('esperaba bid');
    expect(action.amount).not.toBe(2);
    expect(action.amount).toBeGreaterThanOrEqual(0);
    expect(action.amount).toBeLessThanOrEqual(4);
  });

  it('no repartidor: puede cantar libremente dentro de 0..roundSize', () => {
    const view = baseView({
      dealerSeat: 0,
      turnPlayerId: 'p2',
      bids: [null, null, null],
    });
    const action = decidePochaAction(view);
    expect(action?.type).toBe('bid');
    if (action?.type !== 'bid') throw new Error('esperaba bid');
    expect(action.amount).toBeGreaterThanOrEqual(0);
    expect(action.amount).toBeLessThanOrEqual(4);
  });

  it('en fase de baza siempre elige una carta de legalCardIds', () => {
    const view = baseView({
      bids: [1, 1, 2],
      me: {
        playerId: 'p2',
        hand: ['oros-3', 'oros-7', 'copas-5'],
        legalCardIds: ['oros-3', 'oros-7'],
        availableActions: ['playCard'],
      },
    });
    const action = decidePochaAction(view);
    expect(action?.type).toBe('playCard');
    if (action?.type !== 'playCard') throw new Error('esperaba playCard');
    expect(['oros-3', 'oros-7']).toContain(action.cardId);
  });

  it('sin acción disponible (no es mi turno) -> null', () => {
    const view = baseView({
      me: { playerId: 'p2', hand: [], legalCardIds: [], availableActions: [] },
    });
    expect(decidePochaAction(view)).toBeNull();
  });
});

function musView(
  availableActions: MusAvailableAction[],
  me: Partial<MusPlayerView['me']> = {},
): MusPlayerView {
  return {
    kind: 'player',
    roomCode: 'MUSA',
    gameId: 'mus',
    config: DEFAULT_MUS_CONFIG,
    status: 'playing',
    round: 1,
    players: [],
    turnPlayerId: 'p0',
    winnerId: null,
    rematchVotes: [],
    teams: [
      { index: 0, piedras: 0, amarrakos: 0, juegos: 0 },
      { index: 1, piedras: 0, amarrakos: 0, juegos: 0 },
    ],
    winnerTeamIndex: null,
    manoSeat: 0,
    postreSeat: 3,
    phase: 'lance',
    lance: 'grande',
    bet: null,
    musSaid: [null, null, null, null],
    paresDeclared: [null, null, null, null],
    juegoDeclared: [null, null, null, null],
    handResult: null,
    me: {
      playerId: 'p0',
      hand: ['oros-1', 'copas-2', 'espadas-3', 'bastos-4'],
      teamIndex: 0,
      pares: null,
      juego: { suma: 10, tiene: false },
      minEnvite: null,
      availableActions,
      ...me,
    },
  };
}

describe('decideMusAction', () => {
  it('pide mus con una mano floja, corta con duples y pasa sin jugada', () => {
    expect(decideMusAction(musView(['repartir']))).toEqual({ type: 'repartir' });
    expect(
      decideMusAction(
        musView(['mus', 'noMus'], {
          hand: ['oros-4', 'copas-5', 'espadas-6', 'bastos-7'],
          juego: { suma: 22, tiene: false },
        }),
      ),
    ).toEqual({ type: 'mus' });
    expect(
      decideMusAction(
        musView(['mus', 'noMus'], {
          hand: ['oros-12', 'copas-12', 'espadas-3', 'bastos-3'],
          pares: { kind: 'duples', piedras: 3 },
          juego: { suma: 30, tiene: false },
        }),
      ),
    ).toEqual({ type: 'noMus' });
    expect(decideMusAction(musView(['paso', 'envidar', 'ordago']))).toEqual({ type: 'paso' });
  });

  it('descarta de una a cuatro cartas, siempre de su propia mano', () => {
    const view = musView(['descartar']);
    const action = decideMusAction(view);
    expect(action?.type).toBe('descartar');
    if (action?.type !== 'descartar') throw new Error('esperaba descarte');
    expect(action.cardIds.length).toBeGreaterThanOrEqual(1);
    expect(action.cardIds.length).toBeLessThanOrEqual(4);
    expect(action.cardIds.every((cardId) => view.me.hand.includes(cardId))).toBe(true);
  });

  it('declara pares y juego según los datos calculados por el motor', () => {
    expect(
      decideMusAction(musView(['declararPares'], { pares: { kind: 'pareja', piedras: 1 } })),
    ).toEqual({ type: 'declararPares', tiene: true });
    expect(
      decideMusAction(musView(['declararJuego'], { juego: { suma: 30, tiene: false } })),
    ).toEqual({ type: 'declararJuego', tiene: false });
  });

  it('rechaza un envite a pares cuando no tiene pares', () => {
    const view = musView(['querer', 'noQuerer', 'envidar', 'ordago']);
    view.lance = 'pares';
    view.bet = { piedras: 4, byTeam: 1, ifRejected: 2, isOrdago: false };
    expect(decideMusAction(view)).toEqual({ type: 'noQuerer' });
  });
});
