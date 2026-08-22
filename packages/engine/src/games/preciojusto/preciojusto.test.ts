import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRECIO_JUSTO_CONFIG,
  PrecioJustoConfigSchema,
  type PlayerId,
} from '@ronda/protocol';
import { applyAction, createInitialState, pricePointsForRelativeError } from './reducer.ts';
import { PRICE_QUESTIONS, priceQuestionById } from './content.ts';
import { getPlayerView, getTableView } from './views.ts';
import type { PrecioJustoState } from './state.ts';

const PLAYERS = [
  { playerId: 'p1' as PlayerId, nick: 'Ana', seat: 0 },
  { playerId: 'p2' as PlayerId, nick: 'Beto', seat: 1 },
];

function createState(config = DEFAULT_PRECIO_JUSTO_CONFIG): PrecioJustoState {
  return createInitialState({ config, seed: 'precio-test', players: PLAYERS, roomCode: 'TEST' });
}

function apply(
  state: PrecioJustoState,
  playerId: PlayerId,
  action: Parameters<typeof applyAction>[2],
  now = 0,
): PrecioJustoState {
  const result = applyAction(state, playerId, action, now);
  if (!result.ok) throw new Error(`${result.code}: ${result.detail ?? ''}`);
  return result.value.state;
}

describe('Precio justo', () => {
  it('arranca con un catálogo offline amplio y variado', () => {
    expect(PRICE_QUESTIONS.length).toBeGreaterThanOrEqual(244);
    expect(new Set(PRICE_QUESTIONS.map((question) => question.id)).size).toBe(PRICE_QUESTIONS.length);
    expect(new Set(PRICE_QUESTIONS.map((question) => question.title)).size).toBe(PRICE_QUESTIONS.length);
    expect(PRICE_QUESTIONS.every((question) => question.title.length > 0)).toBe(true);
    expect(PRICE_QUESTIONS.every((question) => question.description !== null)).toBe(true);
    expect(new Set(PRICE_QUESTIONS.map((question) => question.category))).toEqual(
      new Set(['hogar', 'tecnologia', 'ocio', 'deporte', 'accesorios', 'curiosos', 'baratos', 'precio-medio']),
    );
    expect(PRICE_QUESTIONS.every((question) => question.image.startsWith('/games/preciojusto/catalog/'))).toBe(true);
  });

  it('baraja de forma determinista y respeta la categoría elegida', () => {
    const first = createState({ ...DEFAULT_PRECIO_JUSTO_CONFIG, category: 'tecnologia' });
    const second = createState({ ...DEFAULT_PRECIO_JUSTO_CONFIG, category: 'tecnologia' });
    expect(first.price.questionOrder).toEqual(second.price.questionOrder);
    expect(first.price.questionOrder.length).toBeGreaterThan(0);
    expect(priceQuestionById(first.price.questionId).category).toBe('tecnologia');
  });

  it('no repite productos cuando una categoría es más pequeña que la partida', () => {
    const state = createState({ ...DEFAULT_PRECIO_JUSTO_CONFIG, rounds: 20, category: 'precio-medio' });
    expect(new Set(state.price.questionOrder.slice(0, 20)).size).toBe(20);
  });

  it('mantiene los precios privados hasta la revelación', () => {
    const state = createState();
    const target = priceQuestionById(state.price.questionId).referencePriceCents;
    const afterFirst = apply(state, 'p1', { type: 'submitPrice', priceCents: target });
    const playerView = getPlayerView(afterFirst, 'p1');
    const tableView = getTableView(afterFirst);

    expect(afterFirst.phase).toBe('input');
    expect(playerView.price.referencePriceCents).toBeNull();
    expect(playerView.price.guesses).toBeNull();
    expect(tableView.price.guesses).toBeNull();
    expect(playerView.me.submitted).toBe(true);
    expect(playerView.me.availableActions).not.toContain('submitPrice');
    expect(JSON.stringify(playerView)).not.toContain(String(target));
  });

  it('calcula la curva de error relativo y suma el resultado', () => {
    const state = createState();
    const target = priceQuestionById(state.price.questionId).referencePriceCents;
    const exact = apply(state, 'p1', { type: 'submitPrice', priceCents: target });
    const revealed = apply(exact, 'p2', { type: 'submitPrice', priceCents: target * 2 });
    const table = getTableView(revealed);

    expect(revealed.phase).toBe('reveal');
    expect(table.price.referencePriceCents).toBe(target);
    expect(table.price.guesses?.p1?.points).toBe(100);
    expect(table.price.guesses?.p2?.relativeErrorPercent).toBe(100);
    expect(table.price.guesses?.p2?.points).toBe(0);
    expect(revealed.players.find((player) => player.playerId === 'p1')?.score).toBe(100);
    expect(pricePointsForRelativeError(5)).toBe(90);
    expect(pricePointsForRelativeError(10)).toBe(80);
    expect(pricePointsForRelativeError(20)).toBe(60);
    expect(pricePointsForRelativeError(35)).toBe(30);
    expect(pricePointsForRelativeError(50)).toBe(0);
  });

  it('solo permite revelar por reloj al llegar al plazo', () => {
    const config = PrecioJustoConfigSchema.parse({ answerTimeSeconds: 10 });
    const state = createState(config);
    state.price.deadlineAt = 10_000;
    const early = applyAction(state, 'p1', { type: 'finishPrice' }, 9_999);
    expect(early).toEqual({ ok: false, code: 'INVALID_ACTION' });

    const late = applyAction(state, 'p1', { type: 'finishPrice' }, 10_000);
    expect(late.ok).toBe(true);
    if (late.ok) expect(late.value.state.phase).toBe('reveal');
  });

  it('avanza de ronda y espera confirmación antes de terminar', () => {
    const config = PrecioJustoConfigSchema.parse({ rounds: 5, answerTimeSeconds: 0 });
    let state = createState(config);
    for (let round = 1; round <= 5; round += 1) {
      const target = priceQuestionById(state.price.questionId).referencePriceCents;
      state = apply(state, 'p1', { type: 'submitPrice', priceCents: target });
      state = apply(state, 'p2', { type: 'submitPrice', priceCents: target });
      if (round < 5) state = apply(state, 'p1', { type: 'nextRound' });
    }
    expect(state.status).toBe('playing');
    expect(state.phase).toBe('reveal');
    expect(getPlayerView(state, 'p1').me.availableActions).toContain('showPriceResults');

    state = apply(state, 'p1', { type: 'showPriceResults' });
    expect(state.status).toBe('gameEnd');
    expect(state.winnerId).toBe('p1');
    expect(state.round).toBe(5);
  });

  it('congela un catálogo remoto inyectado y lo publica sin revelar el precio', () => {
    const original = PRICE_QUESTIONS[0];
    if (!original) throw new Error('El catálogo offline está vacío');
    const remote = {
      ...original,
      id: 'amazon-b0-test',
      title: 'Producto real de Amazon',
      image: 'https://m.media-amazon.com/images/I/test.jpg',
      asin: 'B0TEST1234',
      detailPageUrl: 'https://www.amazon.es/dp/B0TEST1234?tag=ronda-21',
      referencePriceCents: 12345,
      source: 'Amazon.es · Creators API',
    };
    const state = createInitialState({
      config: { ...DEFAULT_PRECIO_JUSTO_CONFIG, rounds: 5 },
      seed: 'amazon-test',
      players: PLAYERS,
      roomCode: 'TEST',
      precioJustoQuestions: [remote],
    });
    const view = getPlayerView(state, 'p1');

    expect(state.questions).toHaveLength(1);
    expect(view.price.product.title).toBe('Producto real de Amazon');
    expect(view.price.product.asin).toBe('B0TEST1234');
    expect(view.price.product.detailPageUrl).toContain('amazon.es');
    expect(view.price.referencePriceCents).toBeNull();
    expect(JSON.stringify(view)).not.toContain('12345');
  });
});
