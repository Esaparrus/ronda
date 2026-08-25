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
  return applyAt(state, playerId, action, 0);
}

function applyAt(
  state: MusicalState,
  playerId: PlayerId,
  action: Parameters<typeof applyAction>[2],
  now: number,
): MusicalState {
  const result = applyAction(state, playerId, action, now);
  if (!result.ok) throw new Error(`${result.code}: ${result.detail ?? ''}`);
  return result.value.state;
}

function selectAndStart(state: MusicalState): MusicalState {
  const selected = apply(state, 'p1', { type: 'musicSelectTrack', track: TRACK });
  return apply(selected, 'p1', { type: 'musicStartClip' });
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

  it('solo activa las respuestas cuando el anfitrión inicia el clip', () => {
    const selected = apply(createState(), 'p1', { type: 'musicSelectTrack', track: TRACK });
    const beforeStart = applyAction(
      selected,
      'p2',
      {
        type: 'musicSubmitGuess',
        artist: TRACK.artist,
        title: TRACK.title,
        year: TRACK.year,
      },
      0,
    );
    expect(beforeStart.ok).toBe(false);

    const nonHostStart = applyAction(selected, 'p2', { type: 'musicStartClip' }, 0);
    expect(nonHostStart.ok).toBe(false);
    if (nonHostStart.ok) return;
    expect(nonHostStart.code).toBe('NOT_HOST');

    const started = apply(selected, 'p1', { type: 'musicStartClip' });
    expect(started.clipStartedAt).toBe(0);
    expect(getPlayerView(started, 'p2').me.availableActions).toContain('musicSubmitGuess');
  });

  it('permite reintentos y puntúa el primer acierto según el clip', () => {
    const selected = selectAndStart(createState());
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
    const selected = selectAndStart(createState());
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
    const selected = selectAndStart(createState());
    const advanced = apply(selected, 'p1', { type: 'musicNextClip' });
    expect(advanced.clipIndex).toBe(1);

    const notHost = applyAction(advanced, 'p2', { type: 'musicNextClip' }, 0);
    expect(notHost.ok).toBe(false);
    if (notHost.ok) return;
    expect(notHost.code).toBe('NOT_HOST');
  });

  it('en modo rapido bloquea al jugador que falla y deja el pulsador al resto', () => {
    const selected = selectAndStart(createState({ ...DEFAULT_MUSICAL_CONFIG, mode: 'velocidad' }));

    const beforeBuzz = applyAction(
      selected,
      'p1',
      { type: 'musicSubmitGuess', artist: 'La Banda', title: 'La canciÃ³n', year: 2020 },
      0,
    );
    expect(beforeBuzz.ok).toBe(false);

    const revealed = apply(selected, 'p1', { type: 'musicNextClip' });
    expect(revealed.phase).toBe('reveal');

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
    expect(wrong.blockedPlayerIds).toEqual(['p2']);
    expect(getPlayerView(wrong, 'p2').me.availableActions).not.toContain('musicBuzz');

    const blockedBuzz = applyAction(wrong, 'p2', { type: 'musicBuzz' }, 0);
    expect(blockedBuzz.ok).toBe(false);

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

  it('en velocidad bloquea revelar mientras alguien está respondiendo', () => {
    const selected = selectAndStart(createState({ ...DEFAULT_MUSICAL_CONFIG, mode: 'velocidad' }));
    const buzzed = apply(selected, 'p2', { type: 'musicBuzz' });

    const reveal = applyAction(buzzed, 'p1', { type: 'musicNextClip' }, 0);
    expect(reveal.ok).toBe(false);
    if (reveal.ok) return;
    expect(reveal.code).toBe('INVALID_ACTION');
    expect(getPlayerView(buzzed, 'p1').me.availableActions).not.toContain('musicNextClip');
  });

  it('permite configurar solo el titulo como respuesta', () => {
    const selected = selectAndStart(
      createState({ ...DEFAULT_MUSICAL_CONFIG, mode: 'simultaneo', answerMode: 'title' }),
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

  it('en online mide el tiempo de cada móvil y gana el acierto más rápido', () => {
    const selected = apply(
      createState({ ...DEFAULT_MUSICAL_CONFIG, audioMode: 'online', mode: 'velocidad' }),
      'p1',
      { type: 'musicSelectTrack', track: TRACK },
    );
    expect(getPlayerView(selected, 'p1').me.availableActions).not.toContain('musicNextClip');
    expect(applyAction(selected, 'p1', { type: 'musicNextClip' }, 500).ok).toBe(false);
    const p1Started = applyAt(selected, 'p1', { type: 'musicStartClip' }, 1_000);
    const bothStarted = applyAt(p1Started, 'p2', { type: 'musicStartClip' }, 1_200);
    const p1Resolved = applyAt(bothStarted, 'p1', { type: 'musicResolveClip' }, 6_000);
    const p2Resolved = applyAt(p1Resolved, 'p2', { type: 'musicResolveClip' }, 7_200);

    expect(getPlayerView(p1Resolved, 'p1').me.availableActions).toContain('musicSubmitGuess');
    expect(getPlayerView(p2Resolved, 'p2').me.onlineClipElapsedMs).toBe(6_000);

    const slowerAnswer = applyAt(
      p2Resolved,
      'p2',
      {
        type: 'musicSubmitGuess',
        artist: TRACK.artist,
        title: TRACK.title,
        year: TRACK.year,
      },
      8_000,
    );
    expect(slowerAnswer.phase).toBe('playing');

    const fastestAnswer = applyAt(
      slowerAnswer,
      'p1',
      {
        type: 'musicSubmitGuess',
        artist: TRACK.artist,
        title: TRACK.title,
        year: TRACK.year,
      },
      9_000,
    );
    expect(fastestAnswer.phase).toBe('reveal');
    expect(fastestAnswer.roundResult?.winnerId).toBe('p1');
    expect(fastestAnswer.roundResult?.responseTimes).toEqual({ p1: 5_000, p2: 6_000 });
    expect(fastestAnswer.players.find((player) => player.playerId === 'p1')?.score).toBe(5);
  });

  it('en online una respuesta incorrecta deja fuera al jugador', () => {
    const selected = apply(
      createState({ ...DEFAULT_MUSICAL_CONFIG, audioMode: 'online', mode: 'velocidad' }),
      'p1',
      { type: 'musicSelectTrack', track: TRACK },
    );
    const started = applyAt(selected, 'p1', { type: 'musicStartClip' }, 1_000);
    const bothStarted = applyAt(started, 'p2', { type: 'musicStartClip' }, 1_100);
    const p1Resolved = applyAt(bothStarted, 'p1', { type: 'musicResolveClip' }, 4_000);
    const p2Resolved = applyAt(p1Resolved, 'p2', { type: 'musicResolveClip' }, 4_500);
    const wrong = applyAt(
      p2Resolved,
      'p2',
      {
        type: 'musicSubmitGuess',
        artist: 'Otra banda',
        title: 'Otra canción',
        year: null,
      },
      5_000,
    );

    expect(wrong.phase).toBe('playing');
    expect(wrong.blockedPlayerIds).toEqual(['p2']);
    expect(getPlayerView(wrong, 'p2').me.availableActions).not.toContain('musicSubmitGuess');

    const retry = applyAction(
      wrong,
      'p2',
      {
        type: 'musicSubmitGuess',
        artist: TRACK.artist,
        title: TRACK.title,
        year: TRACK.year,
      },
      5_500,
    );
    expect(retry.ok).toBe(false);

    const finished = applyAt(
      wrong,
      'p1',
      {
        type: 'musicSubmitGuess',
        artist: TRACK.artist,
        title: TRACK.title,
        year: TRACK.year,
      },
      6_000,
    );
    expect(finished.phase).toBe('reveal');
    expect(finished.roundResult?.winnerId).toBe('p1');
  });

  it('permite revelar en privado al no saberla y espera al resto de dispositivos', () => {
    const selected = apply(
      createState({ ...DEFAULT_MUSICAL_CONFIG, audioMode: 'online', mode: 'velocidad' }),
      'p1',
      { type: 'musicSelectTrack', track: TRACK },
    );
    const started = applyAt(selected, 'p1', { type: 'musicStartClip' }, 1_000);
    const resolved = applyAt(started, 'p1', { type: 'musicResolveClip' }, 4_000);
    expect(getPlayerView(resolved, 'p1').me.availableActions).toContain('musicGiveUp');

    const gaveUp = applyAt(resolved, 'p1', { type: 'musicGiveUp' }, 4_100);
    expect(gaveUp.phase).toBe('playing');
    expect(getPlayerView(gaveUp, 'p1').me.revealedAnswer).toEqual({
      title: TRACK.title,
      artist: TRACK.artist,
      year: TRACK.year,
    });
    expect(JSON.stringify(getTableView(gaveUp))).not.toContain(TRACK.title);

    const p2Started = applyAt(gaveUp, 'p2', { type: 'musicStartClip' }, 5_000);
    const p2Resolved = applyAt(p2Started, 'p2', { type: 'musicResolveClip' }, 7_000);
    const finished = applyAt(
      p2Resolved,
      'p2',
      {
        type: 'musicSubmitGuess',
        artist: TRACK.artist,
        title: TRACK.title,
        year: TRACK.year,
      },
      7_100,
    );
    expect(finished.phase).toBe('reveal');
    expect(finished.roundResult?.winnerId).toBe('p2');
  });

  it('exige el ano cuando la partida lo configura', () => {
    const selected = selectAndStart(
      createState({
        ...DEFAULT_MUSICAL_CONFIG,
        mode: 'simultaneo',
        answerMode: 'artist_title_year',
      }),
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
    const selected = selectAndStart(createState());
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
