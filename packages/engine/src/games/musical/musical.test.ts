import { describe, expect, it } from 'vitest';
import { DEFAULT_MUSICAL_CONFIG, type MusicalTrack, type PlayerId } from '@ronda/protocol';
import { applyAction, createInitialState } from './reducer.ts';
import { getPlayerView, getTableView } from './views.ts';
import type { MusicalState } from './state.ts';

const PLAYERS = [
  { playerId: 'p1' as PlayerId, nick: 'Ana', seat: 0 },
  { playerId: 'p2' as PlayerId, nick: 'Beto', seat: 1 },
];

const TRACK: MusicalTrack = {
  id: '42',
  title: 'La canción',
  artist: 'La Banda',
  year: 2020,
  previewUrl: 'https://example.com/preview.mp4',
  artworkUrl: null,
  storeUrl: 'https://example.com/store',
};

function createState(): MusicalState {
  return createInitialState({
    config: DEFAULT_MUSICAL_CONFIG,
    seed: 'musical-test',
    players: PLAYERS,
    roomCode: 'TEST',
  });
}

function apply(
  state: MusicalState,
  playerId: PlayerId,
  action: Parameters<typeof applyAction>[2],
): MusicalState {
  const result = applyAction(state, playerId, action, 0);
  if (!result.ok) throw new Error(`${result.code}: ${result.detail ?? ''}`);
  return result.value.state;
}

describe('Musical', () => {
  it('oculta la respuesta mientras la ronda está sonando', () => {
    const state = apply(createState(), 'p1', { type: 'musicSelectTrack', track: TRACK });
    const playerView = getPlayerView(state, 'p2');
    const tableView = getTableView(state);

    expect(playerView.phase).toBe('playing');
    expect(playerView.currentTrack?.previewUrl).toBe(TRACK.previewUrl);
    expect(JSON.stringify(playerView)).not.toContain(TRACK.title);
    expect(JSON.stringify(tableView)).not.toContain(TRACK.artist);
  });

  it('permite reintentos y puntúa el primer acierto según el clip', () => {
    const selected = apply(createState(), 'p1', { type: 'musicSelectTrack', track: TRACK });
    const wrong = apply(selected, 'p2', {
      type: 'musicSubmitGuess',
      artist: 'Otra Banda',
      title: 'Otra canción',
      year: null,
    });
    expect(wrong.phase).toBe('playing');
    expect(wrong.guesses.p2).toHaveLength(1);

    const correct = apply(wrong, 'p1', {
      type: 'musicSubmitGuess',
      artist: 'la banda',
      title: 'LA CANCION',
      year: 2020,
    });
    expect(correct.phase).toBe('reveal');
    expect(correct.players.find((player) => player.playerId === 'p1')?.score).toBe(5);
    expect(correct.roundResult?.winnerId).toBe('p1');
    expect(getTableView(correct).roundResult?.title).toBe(TRACK.title);
  });

  it('solo el anfitrión puede ampliar el fragmento y pasar de ronda', () => {
    const selected = apply(createState(), 'p1', { type: 'musicSelectTrack', track: TRACK });
    const advanced = apply(selected, 'p1', { type: 'musicNextClip' });
    expect(advanced.clipIndex).toBe(1);

    const notHost = applyAction(advanced, 'p2', { type: 'musicNextClip' }, 0);
    expect(notHost.ok).toBe(false);
    if (notHost.ok) return;
    expect(notHost.code).toBe('NOT_HOST');
  });
});
