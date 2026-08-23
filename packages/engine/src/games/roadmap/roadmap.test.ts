import { describe, expect, it } from 'vitest';
import {
  BANDERAS_PRESSURE_SECONDS,
  DEFAULT_BANDERAS_CONFIG,
  DEFAULT_CIFRAS_CONFIG,
  DEFAULT_COMPLETA_LA_FRASE_CONFIG,
  DEFAULT_QUIEN_LO_HARIA_CONFIG,
  type GameAction,
  type PlayerId,
} from '@ronda/protocol';
import {
  applyAction,
  cifrasPointsForRelativeError,
  createBanderasState,
  createCifrasState,
  createCompletaLaFraseState,
  createQuienLoHariaState,
  normalizeAnswer,
} from './reducer.ts';
import {
  FLAG_QUESTIONS,
  cifrasQuestionById,
  flagQuestionById,
  flagQuestionIdsFor,
  sentenceQuestionById,
} from './content.ts';
import { getPlayerView, getTableView } from './views.ts';
import type {
  BanderasState,
  CifrasState,
  CompletaLaFraseState,
  QuienLoHariaState,
  RoadmapState,
} from './state.ts';

const PLAYERS = [
  { playerId: 'p1' as PlayerId, nick: 'Ana', seat: 0 },
  { playerId: 'p2' as PlayerId, nick: 'Beto', seat: 1 },
];

function applyRoadmap(
  state: RoadmapState,
  playerId: PlayerId,
  action: GameAction,
  now = 0,
): RoadmapState {
  const result = applyAction(state, playerId, action, now);
  if (!result.ok) throw new Error(`${result.code}: ${result.detail ?? ''}`);
  return result.value.state;
}

describe('juegos independientes del roadmap', () => {
  it('Banderas usa un banco amplio y difícil también con configuraciones antiguas', () => {
    expect(FLAG_QUESTIONS.length).toBeGreaterThanOrEqual(60);
    expect(new Set(FLAG_QUESTIONS.map((question) => question.id)).size).toBe(FLAG_QUESTIONS.length);
    expect(FLAG_QUESTIONS.every((question) => question.difficulty === 'dificil')).toBe(true);

    const africaIds = flagQuestionIdsFor('africa', 'normal');
    expect(africaIds.length).toBeGreaterThanOrEqual(20);
    expect(africaIds.every((id) => flagQuestionById(id).region === 'africa')).toBe(true);

    const legacyConfigState = createBanderasState({
      config: { ...DEFAULT_BANDERAS_CONFIG, difficulty: 'normal', rounds: 5 },
      seed: 'flags-hard-bank',
      players: PLAYERS,
      roomCode: 'HARD',
    });
    expect(legacyConfigState.config.difficulty).toBe('dificil');
    expect(legacyConfigState.questions.every((question) => question.difficulty === 'dificil')).toBe(
      true,
    );
  });

  it('Banderas mantiene la respuesta y la entidad ocultas hasta revelar', () => {
    const state = createBanderasState({
      config: { ...DEFAULT_BANDERAS_CONFIG, rounds: 5, answerTimeSeconds: 0 },
      seed: 'flags-test',
      players: PLAYERS,
      roomCode: 'FLAG',
    });
    const question = flagQuestionById(state.flags.questionId, state.questions);
    expect(question.options).toHaveLength(4);

    const beforeReveal = applyRoadmap(state, 'p1', {
      type: 'submitFlag',
      optionId: question.options[0]?.id ?? '',
    });
    expect(getPlayerView(beforeReveal as BanderasState, 'p1').flags.entityName).toBeNull();
    expect(getTableView(beforeReveal as BanderasState).flags.correctOptionId).toBeNull();

    const revealed = applyRoadmap(beforeReveal, 'p2', {
      type: 'submitFlag',
      optionId: question.correctOptionId,
    }) as BanderasState;
    expect(revealed.phase).toBe('reveal');
    expect(getTableView(revealed).flags.entityName).toBe(question.entityName);
    expect(revealed.players.find((player) => player.playerId === 'p2')?.score).toBe(1);
  });

  it('Banderas abre cinco segundos para el resto al confirmar la primera respuesta', () => {
    const state = createBanderasState({
      config: { ...DEFAULT_BANDERAS_CONFIG, rounds: 5, answerTimeSeconds: 20 },
      seed: 'flags-pressure',
      players: PLAYERS,
      roomCode: 'PRESS',
    });
    const question = flagQuestionById(state.flags.questionId, state.questions);
    const first = applyAction(
      state,
      'p1',
      { type: 'submitFlag', optionId: question.options[0]?.id ?? '' },
      1_000,
    );
    if (!first.ok) throw new Error('la primera respuesta debería aceptarse');

    expect(first.value.state.gameId).toBe('banderas');
    expect((first.value.state as BanderasState).flags.deadlineAt).toBe(
      1_000 + BANDERAS_PRESSURE_SECONDS * 1_000,
    );

    const late = applyAction(
      first.value.state,
      'p2',
      { type: 'submitFlag', optionId: question.correctOptionId },
      6_000,
    );
    expect(late.ok).toBe(false);
  });

  it('Cifras aplica la curva de precisión documentada', () => {
    expect(cifrasPointsForRelativeError(0)).toBe(100);
    expect(cifrasPointsForRelativeError(1)).toBe(98);
    expect(cifrasPointsForRelativeError(5)).toBe(90);
    expect(cifrasPointsForRelativeError(10)).toBe(80);
    expect(cifrasPointsForRelativeError(25)).toBe(50);
    expect(cifrasPointsForRelativeError(50)).toBe(0);

    const state = createCifrasState({
      config: { ...DEFAULT_CIFRAS_CONFIG, mode: 'estimacion', rounds: 5, answerTimeSeconds: 0 },
      seed: 'numbers-test',
      players: PLAYERS,
      roomCode: 'NUMB',
    });
    const question = cifrasQuestionById(state.cifras.questionId, state.questions);
    if (question.kind !== 'estimate') throw new Error('La pregunta de test no es de estimación');
    const exact = applyRoadmap(state, 'p1', {
      type: 'submitNumber',
      value: question.referenceValue,
    });
    expect(getPlayerView(exact as CifrasState, 'p1').cifras.referenceValue).toBeNull();
    const revealed = applyRoadmap(exact, 'p2', { type: 'submitNumber', value: 0 }) as CifrasState;
    expect(revealed.phase).toBe('reveal');
    expect(getTableView(revealed).cifras.referenceValue).toBe(question.referenceValue);
    expect(getTableView(revealed).cifras.estimates?.p1?.points).toBe(100);
  });

  it('Cifras puntúa el orden correcto y la respuesta completa', () => {
    const state = createCifrasState({
      config: { ...DEFAULT_CIFRAS_CONFIG, mode: 'ordena', rounds: 5, answerTimeSeconds: 0 },
      seed: 'order-test',
      players: PLAYERS,
      roomCode: 'ORDR',
    });
    const question = cifrasQuestionById(state.cifras.questionId, state.questions);
    if (question.kind !== 'order') throw new Error('La pregunta de test no es de ordenar');
    const correctOrder = [...question.items]
      .sort((left, right) =>
        question.direction === 'asc' ? left.value - right.value : right.value - left.value,
      )
      .map((item) => item.id);
    const afterFirst = applyRoadmap(state, 'p1', { type: 'submitOrder', order: correctOrder });
    const revealed = applyRoadmap(afterFirst, 'p2', {
      type: 'submitOrder',
      order: [...correctOrder].reverse(),
    }) as CifrasState;
    expect(getTableView(revealed).cifras.orders?.p1?.points).toBe(question.items.length + 1);
    expect(getTableView(revealed).cifras.orders?.p2?.points).toBeLessThan(
      question.items.length + 1,
    );
  });

  it('Quién lo haría oculta votos individuales antes de la revelación', () => {
    const state = createQuienLoHariaState({
      config: { ...DEFAULT_QUIEN_LO_HARIA_CONFIG, rounds: 5, answerTimeSeconds: 0 },
      seed: 'who-test',
      players: PLAYERS,
      roomCode: 'WHO1',
    });
    const afterFirst = applyRoadmap(state, 'p1', { type: 'submitWhoVote', targetPlayerId: 'p2' });
    expect(getPlayerView(afterFirst as QuienLoHariaState, 'p1').who.votes).toBeNull();
    const revealed = applyRoadmap(afterFirst, 'p2', {
      type: 'submitWhoVote',
      targetPlayerId: 'p1',
    }) as QuienLoHariaState;
    expect(revealed.phase).toBe('reveal');
    expect(getTableView(revealed).who.voteCounts).toEqual({ p1: 1, p2: 1 });
  });

  it('Completa la frase normaliza acentos y no premia usar una pista', () => {
    expect(normalizeAnswer('  ÁRBOL!!!  ')).toBe('arbol');
    const state = createCompletaLaFraseState({
      config: { ...DEFAULT_COMPLETA_LA_FRASE_CONFIG, rounds: 5, answerTimeSeconds: 0, hints: true },
      seed: 'sentence-test',
      players: PLAYERS,
      roomCode: 'SENT',
    });
    const question = sentenceQuestionById(state.sentence.questionId, state.questions);
    const afterHint = applyRoadmap(state, 'p1', { type: 'useSentenceHint' });
    const afterFirst = applyRoadmap(afterHint, 'p1', {
      type: 'submitSentence',
      answer: question.canonicalAnswer,
    });
    const revealed = applyRoadmap(afterFirst, 'p2', {
      type: 'submitSentence',
      answer: question.canonicalAnswer.toUpperCase(),
    }) as CompletaLaFraseState;
    expect(getTableView(revealed).sentence.answers?.p1?.correct).toBe(true);
    expect(getTableView(revealed).sentence.answers?.p1?.points).toBe(0);
    expect(getTableView(revealed).sentence.answers?.p2?.points).toBe(1);
  });
});
