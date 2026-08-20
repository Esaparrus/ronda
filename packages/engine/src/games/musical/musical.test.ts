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

function createState(
  config: typeof DEFAULT_MUSICAL_CONFIG = { ...DEFAULT_MUSICAL_CONFIG, mode: 'simultaneo' },
): MusicalState {
  return createInitialState({
    config,
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
    expect(playerView.currentTrack).toEqual({ id: TRACK.id, previewUrl: TRACK.previewUrl });
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

  it('tolera un error pequeño de escritura en artista y título', () => {
    const selected = apply(createState(), 'p1', { type: 'musicSelectTrack', track: TRACK });
    const result = apply(selected, 'p2', {
      type: 'musicSubmitGuess',
      artist: 'La Bnda',
      title: 'La cancion',
      year: null,
    });

    expect(result.phase).toBe('reveal');
    expect(result.roundResult?.winnerId).toBe('p2');
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

  it('en modo rapido reserva el pulsador y lo libera si hay un fallo', () => {
    const selected = apply(createState({ ...DEFAULT_MUSICAL_CONFIG, mode: 'velocidad' }), 'p1', {
      type: 'musicSelectTrack',
      track: TRACK,
    });

    const beforeBuzz = applyAction(
      selected,
      'p1',
      { type: 'musicSubmitGuess', artist: 'La Banda', title: 'La canciÃ³n', year: 2020 },
      0,
    );
    expect(beforeBuzz.ok).toBe(false);

    const buzzed = apply(selected, 'p2', { type: 'musicBuzz' });
    expect(buzzed.buzzedPlayerId).toBe('p2');
    expect(getPlayerView(buzzed, 'p2').me.availableActions).toContain('musicSubmitGuess');
    expect(getPlayerView(buzzed, 'p1').me.availableActions).not.toContain('musicSubmitGuess');

    const secondBuzz = applyAction(buzzed, 'p1', { type: 'musicBuzz' }, 0);
    expect(secondBuzz.ok).toBe(false);

    const wrong = apply(buzzed, 'p2', {
      type: 'musicSubmitGuess',
      artist: 'Otra Banda',
      title: 'Otra canciÃ³n',
      year: null,
    });
    expect(wrong.phase).toBe('playing');
    expect(wrong.buzzedPlayerId).toBeNull();

    const p1Buzz = apply(wrong, 'p1', { type: 'musicBuzz' });
    const correct = apply(p1Buzz, 'p1', {
      type: 'musicSubmitGuess',
      artist: 'La Banda',
      title: 'La canciÃ³n',
      year: null,
    });
    expect(correct.phase).toBe('reveal');
    expect(correct.roundResult?.winnerId).toBe('p1');
  });

  it('permite configurar solo el titulo como respuesta', () => {
    const selected = apply(
      createState({ ...DEFAULT_MUSICAL_CONFIG, mode: 'simultaneo', answerMode: 'title' }),
      'p1',
      { type: 'musicSelectTrack', track: TRACK },
    );
    const result = apply(selected, 'p2', {
      type: 'musicSubmitGuess',
      artist: '',
      title: 'La cancion',
      year: null,
    });

    expect(result.phase).toBe('reveal');
    expect(result.roundResult?.winnerId).toBe('p2');
  });

  it('exige el ano cuando la partida lo configura', () => {
    const selected = apply(
      createState({
        ...DEFAULT_MUSICAL_CONFIG,
        mode: 'simultaneo',
        answerMode: 'artist_title_year',
      }),
      'p1',
      { type: 'musicSelectTrack', track: TRACK },
    );
    const incomplete = applyAction(
      selected,
      'p2',
      { type: 'musicSubmitGuess', artist: 'La Banda', title: 'La cancion', year: null },
      0,
    );

    expect(incomplete.ok).toBe(false);
  });

  it('rechaza volver a seleccionar una canción ya usada en la partida', () => {
    const selected = apply(createState(), 'p1', { type: 'musicSelectTrack', track: TRACK });
    const won = apply(selected, 'p2', {
      type: 'musicSubmitGuess',
      artist: TRACK.artist,
      title: TRACK.title,
      year: TRACK.year,
    });
    const nextRound = apply(won, 'p1', { type: 'musicNextRound' });
    const repeated = applyAction(nextRound, 'p1', { type: 'musicSelectTrack', track: TRACK }, 0);

    expect(repeated.ok).toBe(false);
    if (repeated.ok) return;
    expect(repeated.code).toBe('INVALID_ACTION');
  });
});
