import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRISCA_CONFIG,
  DEFAULT_CINQUILLO_CONFIG,
  DEFAULT_ESCOBA_CONFIG,
  DEFAULT_SIETE_Y_MEDIA_CONFIG,
  DEFAULT_TUTE_CONFIG,
  type CardId,
  type ClassicConfig,
  type ClassicGameId,
  type GameAction,
} from '@ronda/protocol';
import { applyClassicAction, createClassicState, legalCardsFor } from './reducer.ts';
import { escobaValue } from './rules.ts';
import { getClassicPlayerView, getClassicTableView } from './views.ts';
import type { ClassicState } from './state.ts';

const CONFIGS: Record<ClassicGameId, ClassicConfig> = {
  brisca: DEFAULT_BRISCA_CONFIG,
  escoba: DEFAULT_ESCOBA_CONFIG,
  sieteymedia: DEFAULT_SIETE_Y_MEDIA_CONFIG,
  tute: DEFAULT_TUTE_CONFIG,
  cinquillo: DEFAULT_CINQUILLO_CONFIG,
};

function stateFor(gameId: ClassicGameId, playerCount = 2): ClassicState {
  const players = Array.from({ length: playerCount }, (_, seat) => ({
    playerId: `p${seat}`,
    nick: `Jugador ${seat + 1}`,
    seat,
  }));
  return createClassicState({ config: CONFIGS[gameId], players, seed: 'classic-test' }, gameId);
}

function captureFor(cardId: CardId, table: readonly CardId[]): CardId[] {
  const target = 15 - escobaValue(cardId);
  function search(index: number, remaining: number, chosen: CardId[]): CardId[] | null {
    if (remaining === 0) return chosen;
    if (remaining < 0 || index >= table.length) return null;
    const card = table[index];
    if (!card) return null;
    return (
      search(index + 1, remaining - escobaValue(card), [...chosen, card]) ??
      search(index + 1, remaining, chosen)
    );
  }
  return search(0, target, []) ?? [];
}

function nextAction(state: ClassicState): { playerId: string; action: GameAction } {
  const player = state.turnSeat === null ? undefined : state.players[state.turnSeat];
  if (!player) throw new Error('partida sin turno');
  if (state.gameId === 'brisca' || state.gameId === 'tute') {
    const cardId = legalCardsFor(state, player)[0];
    if (!cardId) throw new Error('sin carta legal de baza');
    return { playerId: player.playerId, action: { type: 'playCard', cardId } };
  }
  if (state.gameId === 'escoba') {
    const cardId = player.hand[0];
    if (!cardId) throw new Error('sin carta de escoba');
    return {
      playerId: player.playerId,
      action: { type: 'playCapture', cardId, captureIds: captureFor(cardId, state.tableCards) },
    };
  }
  if (state.gameId === 'sieteymedia') {
    return { playerId: player.playerId, action: { type: 'stand' } };
  }
  const cardId = legalCardsFor(state, player)[0];
  return {
    playerId: player.playerId,
    action: cardId ? { type: 'playCard', cardId } : { type: 'pass' },
  };
}

function playToEnd(initial: ClassicState): ClassicState {
  let state = initial;
  for (let guard = 0; guard < 500 && state.status !== 'gameEnd'; guard++) {
    const { playerId, action } = nextAction(state);
    const result = applyClassicAction(state, playerId, action, guard);
    if (!result.ok) throw new Error(`${state.gameId}: ${result.code}`);
    state = result.value.state;
  }
  return state;
}

describe('clásicos de baraja española', () => {
  for (const gameId of Object.keys(CONFIGS) as ClassicGameId[]) {
    it(`${gameId} completa una partida determinista`, () => {
      const final = playToEnd(stateFor(gameId));
      expect(final.status).toBe('gameEnd');
      expect(final.winnerId).toBeTruthy();
      expect(final.version).toBeGreaterThan(0);
    });
  }

  for (const [gameId, playerCount] of [
    ['brisca', 4],
    ['escoba', 4],
    ['sieteymedia', 7],
    ['cinquillo', 6],
  ] as const) {
    it(`${gameId} completa una partida con ${playerCount} jugadores`, () => {
      expect(playToEnd(stateFor(gameId, playerCount)).status).toBe('gameEnd');
    });
  }

  it('la mesa nunca recibe las cartas privadas', () => {
    const state = stateFor('brisca');
    const privateCard = state.players[0]?.hand[0];
    expect(privateCard).toBeTruthy();
    expect(JSON.stringify(getClassicTableView(state))).not.toContain(privateCard);
    expect(getClassicPlayerView(state, 'p0').me.hand).toContain(privateCard);
  });

  it('Tute obliga a asistir cuando se agota la baceta', () => {
    const state = stateFor('tute');
    state.deck = [];
    state.turnSeat = 1;
    state.currentTrick = [{ seat: 0, cardId: 'oros-1' }];
    const follower = state.players[1];
    if (!follower) throw new Error('falta el segundo jugador');
    follower.hand = ['oros-2', 'copas-1'];
    const result = applyClassicAction(state, 'p1', { type: 'playCard', cardId: 'copas-1' }, 0);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('MUST_FOLLOW_SUIT');
  });

  it('Escoba solo permite capturas que suman quince', () => {
    const state = stateFor('escoba');
    state.turnSeat = 0;
    const first = state.players[0];
    if (!first) throw new Error('falta el primer jugador');
    first.hand = ['oros-7'];
    state.tableCards = ['copas-2', 'bastos-3'];
    const result = applyClassicAction(
      state,
      'p0',
      { type: 'playCapture', cardId: 'oros-7', captureIds: ['copas-2', 'bastos-3'] },
      0,
    );
    expect(result.ok).toBe(false);
  });

  it('Cinquillo empieza por el cinco de oros', () => {
    const state = stateFor('cinquillo');
    const starter = state.players[state.turnSeat ?? -1];
    expect(starter).toBeTruthy();
    expect(starter ? legalCardsFor(state, starter) : []).toEqual(['oros-5']);
  });
});
