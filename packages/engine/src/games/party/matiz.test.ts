import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MATIZ_CONFIG,
  matizChallengeById,
  type PlayerId,
} from '@ronda/protocol';
import { applyAction, createPartyState } from './reducer.ts';
import { getPlayerView } from './views.ts';
import type { PartyState } from './state.ts';

const PLAYERS = [
  { playerId: 'p1' as PlayerId, nick: 'Ana', seat: 0 },
  { playerId: 'p2' as PlayerId, nick: 'Beto', seat: 1 },
];

function createMatiz(): PartyState {
  return createPartyState(
    {
      config: { ...DEFAULT_MATIZ_CONFIG, rounds: 3 },
      seed: 'matiz-test',
      players: PLAYERS,
      roomCode: 'MATZ',
    },
    'matiz',
  );
}

function apply(
  state: PartyState,
  playerId: PlayerId,
  action: Parameters<typeof applyAction>[2],
): PartyState {
  const result = applyAction(state, playerId, action, 0);
  if (!result.ok) throw new Error(`${result.code}: ${result.detail ?? ''}`);
  return result.value.state;
}

function matizView(state: PartyState, playerId: PlayerId) {
  const view = getPlayerView(state, playerId);
  if (view.gameId !== 'matiz') throw new Error('vista incorrecta');
  return view;
}

describe('Matiz', () => {
  it('oculta el objetivo y da 100 puntos al color exacto cuando responde toda la mesa', () => {
    const state = createMatiz();
    if (!state.matiz) throw new Error('sin ronda de Matiz');
    const target = matizChallengeById(state.matiz.challengeId).targetHex;

    expect(matizView(state, 'p1').party.targetHex).toBeNull();

    const oneAnswer = apply(state, 'p1', { type: 'submitMatiz', hex: target });
    expect(oneAnswer.phase).toBe('input');

    const revealed = apply(oneAnswer, 'p2', { type: 'submitMatiz', hex: '#000000' });
    const view = matizView(revealed, 'p1');

    expect(revealed.phase).toBe('reveal');
    expect(view.party.targetHex).toBe(target);
    expect(view.party.answers?.p1).toBe(target);
    expect(view.party.scoreDeltas?.p1).toBe(100);
    expect(view.players.find((player) => player.playerId === 'p1')?.score).toBe(100);
  });

  it('permite al anfitrión revelar respuestas parciales y no admite dos envíos', () => {
    const state = createMatiz();
    const submitted = apply(state, 'p1', { type: 'submitMatiz', hex: '#f4c542' });
    const duplicate = applyAction(submitted, 'p1', { type: 'submitMatiz', hex: '#ffffff' }, 0);

    expect(duplicate.ok).toBe(false);

    const revealed = apply(submitted, 'p1', { type: 'finishMatiz' });
    const view = matizView(revealed, 'p2');

    expect(revealed.phase).toBe('reveal');
    expect(view.party.answers?.p1).toBe('#f4c542');
    expect(view.party.answers?.p2).toBeUndefined();
    expect(view.party.scoreDeltas?.p2).toBe(0);
  });

  it('usa únicamente los retos seleccionados por quien crea la sala', () => {
    const state = createPartyState(
      {
        config: {
          ...DEFAULT_MATIZ_CONFIG,
          rounds: 3,
          challengeIds: ['popeye-camiseta', 'logo-extra-windows', 'reto-inexistente'],
        },
        seed: 'matiz-selection-test',
        players: PLAYERS,
        roomCode: 'MSEL',
      },
      'matiz',
    );

    expect(state.matiz?.challengeOrder).toHaveLength(2);
    expect(state.matiz?.challengeOrder).toEqual(
      expect.arrayContaining(['popeye-camiseta', 'logo-extra-windows']),
    );
  });
});
