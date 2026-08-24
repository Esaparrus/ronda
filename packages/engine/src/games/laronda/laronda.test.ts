import { describe, expect, it } from 'vitest';
import { DEFAULT_LA_RONDA_CONFIG, type GameAction, type PlayerId } from '@ronda/protocol';
import { RONDA_CARDS } from './cards.ts';
import { applyRondaAction, createRondaState } from './reducer.ts';
import { calculateRondaBill, legalOrderingCardIds, wineCostCents } from './rules.ts';
import { getRondaPlayerView, getRondaTableView } from './views.ts';
import type { RondaState } from './state.ts';

const PLAYERS = [
  { playerId: 'p1' as PlayerId, nick: 'Ana', seat: 0 },
  { playerId: 'p2' as PlayerId, nick: 'Beto', seat: 1 },
  { playerId: 'p3' as PlayerId, nick: 'Carla', seat: 2 },
];

function create(seed = 'ronda-test'): RondaState {
  return createRondaState({
    config: DEFAULT_LA_RONDA_CONFIG,
    players: PLAYERS,
    seed,
    roomCode: 'TEST',
  });
}

function apply(state: RondaState, playerId: PlayerId, action: GameAction): RondaState {
  const result = applyRondaAction(state, playerId, action, 0);
  if (!result.ok) throw new Error(`${result.code}: ${action.type}`);
  return result.value.state;
}

describe('La Ronda', () => {
  it('construye una baraja original de 100 cartas con el reparto previsto', () => {
    expect(RONDA_CARDS).toHaveLength(100);
    expect(new Set(RONDA_CARDS.map((card) => card.id)).size).toBe(100);
    expect(RONDA_CARDS.filter((card) => card.kind === 'tapa')).toHaveLength(48);
    expect(RONDA_CARDS.filter((card) => card.kind === 'vino')).toHaveLength(10);
    expect(RONDA_CARDS.filter((card) => card.kind === 'servicio')).toHaveLength(6);
  });

  it('admite de 2 a 8 personas, reparte cinco cartas y escala el ahorro inicial', () => {
    for (let count = 2; count <= 8; count += 1) {
      const players = Array.from({ length: count }, (_, seat) => ({
        playerId: `p${seat}` as PlayerId,
        nick: `P${seat}`,
        seat,
      }));
      const state = createRondaState({
        config: DEFAULT_LA_RONDA_CONFIG,
        players,
        seed: `count-${count}`,
      });
      expect(state.players.every((player) => player.hand.length === 5)).toBe(true);
      expect(state.players.every((player) => player.score === (600 + count * 100) * 100)).toBe(
        true,
      );
      const dealt = state.players.flatMap((player) => player.hand);
      expect(new Set(dealt).size).toBe(dealt.length);
    }
    expect(() =>
      createRondaState({
        config: DEFAULT_LA_RONDA_CONFIG,
        players: PLAYERS.slice(0, 1),
        seed: 'too-few',
      }),
    ).toThrow();
  });

  it('mantiene las manos ajenas fuera de las vistas pública y privada', () => {
    const state = create();
    const privateView = getRondaPlayerView(state, 'p1');
    const tableView = getRondaTableView(state);
    const p2Card = state.players[1]?.hand[0];
    expect(privateView.me.hand).toHaveLength(5);
    expect(JSON.stringify(tableView)).not.toContain(p2Card);
    expect(JSON.stringify(privateView)).not.toContain(p2Card);
  });

  it('juega una carta legal, avanza el turno y conserva el estado anterior', () => {
    const state = create();
    const first = state.players[0];
    if (!first) throw new Error('sin mano');
    const cardId = legalOrderingCardIds(state, first)[0];
    if (!cardId) throw new Error('el reparto inicial debe tener jugada');
    const before = structuredClone(state);
    const next = apply(state, first.playerId, { type: 'playRondaCard', cardId });
    expect(next.turnSeat).toBe(1);
    expect(next.orderingCardCount).toBe(1);
    expect(next.players[0]?.hand).not.toContain(cardId);
    expect(state).toEqual(before);
  });

  it('calcula el vino por grupos de cinco', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(wineCostCents)).toEqual([
      0, 3000, 6000, 12000, 18000, 24000, 27000,
    ]);
  });

  it('resuelve una cuenta individual tras una vuelta completa de pases', () => {
    let state = create();
    state = {
      ...state,
      orderingCardCount: 3,
      tapas: {
        ...state.tapas,
        carne: [
          {
            cardId: 'tapa-carne-pincho-moruno-1',
            priceCents: 1000,
            effectivePriceCents: 1000,
            premiumCardId: null,
          },
        ],
      },
      playedCardIds: ['tapa-carne-pincho-moruno-1'],
    };
    expect(calculateRondaBill(state)).toBe(1000);
    state = apply(state, 'p1', { type: 'askRondaBill' });
    state = apply(state, 'p1', { type: 'chooseRondaBillMode', mode: 'solo' });
    for (const playerId of ['p2', 'p3', 'p1'] as PlayerId[]) {
      state = apply(state, playerId, { type: 'passRondaBill' });
    }
    expect(state.phase).toBe('discard');
    expect(state.roundResult?.totalCents).toBe(1000);
    expect(state.players[0]?.score).toBe(89000);
    expect(state.players[1]?.score).toBe(90000);
    expect(state.players[0]?.handLimit).toBe(6);
  });
});
