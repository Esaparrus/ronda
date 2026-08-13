import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COLORES_CONFIG,
  DEFAULT_ESCALA_CONFIG,
  DEFAULT_MAYORIA_CONFIG,
  DEFAULT_ORDEN_CONFIG,
  type PlayerId,
} from '@ronda/protocol';
import { applyAction, createPartyState } from './reducer.ts';
import { getPlayerView, getTableView } from './views.ts';
import type { PartyState } from './state.ts';

const PLAYERS = [
  { playerId: 'p1' as PlayerId, nick: 'Ana', seat: 0 },
  { playerId: 'p2' as PlayerId, nick: 'Beto', seat: 1 },
  { playerId: 'p3' as PlayerId, nick: 'Carla', seat: 2 },
];

function createOrder(): PartyState {
  return createPartyState({
    config: { ...DEFAULT_ORDEN_CONFIG, cardsPerPlayer: 1 },
    seed: 'party-test',
    players: PLAYERS,
    roomCode: 'TEST',
  }, 'orden');
}

function createColors(): PartyState {
  return createPartyState({
    config: DEFAULT_COLORES_CONFIG,
    seed: 'colors-test',
    players: PLAYERS,
    roomCode: 'TEST',
  }, 'colores');
}

function createMajority(): PartyState {
  return createPartyState({
    config: DEFAULT_MAYORIA_CONFIG,
    seed: 'majority-test',
    players: PLAYERS,
    roomCode: 'TEST',
  }, 'mayoria');
}

function createScale(): PartyState {
  return createPartyState({
    config: DEFAULT_ESCALA_CONFIG,
    seed: 'scale-test',
    players: PLAYERS,
    roomCode: 'TEST',
  }, 'escala');
}

function apply(state: PartyState, playerId: PlayerId, action: Parameters<typeof applyAction>[2]): PartyState {
  const result = applyAction(state, playerId, action, 0);
  if (!result.ok) throw new Error(`${result.code}: ${result.detail ?? ''}`);
  return result.value.state;
}

describe('modos sociales', () => {
  it('mantiene las cartas de Orden privadas y las expone solo tras jugarlas', () => {
    const state = createOrder();
    const p1Card = Number(state.players[0]?.hand[0]);
    const p2Card = Number(state.players[1]?.hand[0]);
    const p1View = getPlayerView(state, 'p1');
    const table = getTableView(state);

    expect(p1View.kind).toBe('player');
    expect(p1View.me.hand).toEqual([p1Card]);
    expect(JSON.stringify(p1View)).not.toContain(String(p2Card));
    expect(JSON.stringify(table)).not.toContain(String(p1Card));

    const next = apply(state, 'p1', { type: 'playNumber', value: p1Card });
    const publicView = getTableView(next);
    if (publicView.party.gameId !== 'orden') throw new Error('vista incorrecta');
    expect(publicView.party.played.some((played) => played.value === p1Card)).toBe(true);
  });

  it('detiene Orden en el primer fallo y permite repartir de nuevo o terminar', () => {
    const state = createOrder();
    const cards = state.players.map((player) => ({ playerId: player.playerId, value: Number(player.hand[0]) }));
    const high = cards.reduce((best, card) => (card.value > best.value ? card : best));
    const low = cards.reduce((best, card) => (card.value < best.value ? card : best));

    const afterHigh = apply(state, high.playerId, { type: 'playNumber', value: high.value });
    const failed = apply(afterHigh, low.playerId, { type: 'playNumber', value: low.value });
    expect(failed.phase).toBe('reveal');
    expect(failed.order?.failure?.value).toBe(low.value);
    expect(failed.order?.nextCardsPerPlayer).toBe(1);

    const remaining = failed.players.find((player) => player.hand.length > 0);
    if (!remaining) throw new Error('faltaba una carta por jugar');
    const stopped = applyAction(failed, remaining.playerId, {
      type: 'playNumber',
      value: Number(remaining.hand[0]),
    }, 0);
    expect(stopped).toEqual({ ok: false, code: 'INVALID_ACTION' });

    const nonHostRestart = applyAction(failed, 'p2', { type: 'nextRound' }, 0);
    expect(nonHostRestart).toEqual({ ok: false, code: 'NOT_HOST' });
    const configured = apply(failed, 'p1', { type: 'setOrderCards', count: 2 });
    expect(configured.order?.nextCardsPerPlayer).toBe(2);
    const nextLevel = apply(configured, 'p1', { type: 'nextRound' });
    expect(nextLevel.phase).toBe('input');
    expect(nextLevel.order?.cardsPerPlayer).toBe(2);
    expect(nextLevel.players.every((player) => player.hand.length === 2)).toBe(true);

    const ended = apply(failed, 'p1', { type: 'endOrder' });
    expect(ended.status).toBe('gameEnd');
    expect(ended.winnerId).toBeNull();
  });

  it('revela Colores cuando todos han enviado su selección', () => {
    let state = createColors();
    state = apply(state, 'p1', { type: 'submitColors', colors: ['rojo'] });
    state = apply(state, 'p2', { type: 'submitColors', colors: ['rojo'] });
    expect(state.phase).toBe('input');
    state = apply(state, 'p3', { type: 'submitColors', colors: ['rojo'] });
    expect(state.phase).toBe('reveal');
    const view = getPlayerView(state, 'p1');
    if (view.party.gameId !== 'colores') throw new Error('vista incorrecta');
    expect(view.party.answers).not.toBeNull();
    expect(view.party.correctColors).not.toBeNull();
  });

  it('agrupa Mayoría ignorando mayúsculas, tildes y puntuación', () => {
    let state = createMajority();
    state = apply(state, 'p1', { type: 'submitMajority', answer: 'Salsa!' });
    state = apply(state, 'p2', { type: 'submitMajority', answer: ' salsa ' });
    state = apply(state, 'p3', { type: 'submitMajority', answer: 'SÁLSA' });
    expect(state.phase).toBe('reveal');
    expect(state.majority?.majorityAnswers).toEqual(['Salsa!']);
    expect(state.players.every((player) => player.score === 1)).toBe(true);
  });

  it('oculta el objetivo de Escala hasta que todos estiman', () => {
    let state = createScale();
    const guide = state.scale?.cluePlayerId;
    if (!guide) throw new Error('sin guía');
    const others = PLAYERS.filter((player) => player.playerId !== guide);
    const before = getTableView(state);
    if (before.party.gameId !== 'escala') throw new Error('vista incorrecta');
    expect(before.party.target).toBeNull();
    state = apply(state, others[0]?.playerId ?? 'p2', { type: 'submitScale', value: 20 });
    expect(state.phase).toBe('input');
    state = apply(state, others[1]?.playerId ?? 'p3', { type: 'submitScale', value: 80 });
    expect(state.phase).toBe('reveal');
    const after = getTableView(state);
    if (after.party.gameId !== 'escala') throw new Error('vista incorrecta');
    expect(after.party.target).not.toBeNull();
  });
});
