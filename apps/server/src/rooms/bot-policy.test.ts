// Tests de la política del bot de Pocha (modo "contra la máquina"). Mismo
// listón que la política de Chinchón (P9: legal y rápida, no necesariamente
// buena) -- aquí solo se comprueba que nunca produce una acción ilegal.
import { describe, it, expect } from 'vitest';
import { decidePochaAction } from './bot-policy.ts';
import { DEFAULT_POCHA_CONFIG, type PochaPlayerView } from '@ronda/protocol';

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
    const view = baseView({ me: { playerId: 'p2', hand: [], legalCardIds: [], availableActions: [] } });
    expect(decidePochaAction(view)).toBeNull();
  });
});
