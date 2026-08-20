'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import type { MusicalConfig } from '@ronda/protocol';
import { BackToGames } from '@/components/ui/BackToGames';
import { Button } from '@/components/ui/Button';
import { MusicAutocompleteInput } from '@/components/ui/MusicAutocompleteInput';
import { MusicalFeedback } from '@/components/ui/MusicalFeedback';
import { MusicRegionSelector } from '@/components/ui/MusicRegionSelector';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  DEFAULT_MUSIC_FILTERS,
  isMusicAnswerCorrect,
  musicFiltersLabel,
  musicPreviewUrl,
  MUSICAL_ANSWER_MODE_OPTIONS,
  MUSICAL_GENRE_OPTIONS,
  MUSICAL_POPULARITY_OPTIONS,
  pickRandomMusicTracks,
  pointsForMusicClip,
  type MusicFilters,
  type MusicTrack,
} from '@/lib/musical';
import { playMusicalFeedback, type MusicalFeedbackKind } from '@/lib/musical-feedback';
import { MusicYearRangeControl } from '@/components/ui/MusicYearRangeControl';

type SoloPhase = 'setup' | 'playing' | 'reveal' | 'finished';
type SoloListenMode = 'velocidad' | 'segundos';

export const SOLO_MUSICAL_CLIP_STEPS = [1, 3, 5, 10, 30] as const;

interface Guess {
  artist: string;
  title: string;
  year: string;
}

const EMPTY_GUESS: Guess = { artist: '', title: '', year: '' };

function soloClipLabel(seconds: number): string {
  return seconds >= 30 ? 'la preview completa (30 s)' : `${seconds} segundos`;
}

function resetAudioElement(audio: HTMLAudioElement) {
  audio.pause();
  // currentTime puede fallar mientras una preview remota aún no tiene metadatos.
  if (audio.readyState > 0) {
    try {
      audio.currentTime = 0;
    } catch {
      // El siguiente play() volverá a posicionar el elemento cuando esté listo.
    }
  }
}

export function SoloMusicalGame() {
  const [phase, setPhase] = useState<SoloPhase>('setup');
  const [rounds, setRounds] = useState(5);
  const [filters, setFilters] = useState<MusicFilters>(DEFAULT_MUSIC_FILTERS);
  const [listenMode, setListenMode] = useState<SoloListenMode>('segundos');
  const [answerMode, setAnswerMode] = useState<MusicalConfig['answerMode']>('artist_title');
  const [selectedTracks, setSelectedTracks] = useState<MusicTrack[]>([]);
  const [starting, setStarting] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [clipIndex, setClipIndex] = useState(0);
  const [guess, setGuess] = useState<Guess>(EMPTY_GUESS);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [roundPoints, setRoundPoints] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<MusicalFeedbackKind | null>(null);
  const [feedbackNonce, setFeedbackNonce] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [clipReady, setClipReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = selectedTracks[currentIndex] ?? null;
  const clipSeconds = SOLO_MUSICAL_CLIP_STEPS[clipIndex] ?? SOLO_MUSICAL_CLIP_STEPS[0];
  const nextClipSeconds = SOLO_MUSICAL_CLIP_STEPS[clipIndex + 1] ?? null;
  const isSpeedMode = listenMode === 'velocidad';
  const requiresArtist = answerMode !== 'title';
  const requiresYear = answerMode === 'artist_title_year';

  function triggerFeedback(kind: MusicalFeedbackKind) {
    setFeedback(kind);
    setFeedbackNonce((current) => current + 1);
    playMusicalFeedback(kind);
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    resetAudioElement(audio);
    setPlaying(false);
    setClipReady(false);
  }, [currentIndex, clipIndex, track?.id, listenMode]);

  async function startGame() {
    if (starting) return;
    setStarting(true);
    setSetupError(null);
    try {
      const pool = await pickRandomMusicTracks(filters, rounds);
      setSelectedTracks(pool);
      setCurrentIndex(0);
      setClipIndex(0);
      setGuess(EMPTY_GUESS);
      setAttempts(0);
      setScore(0);
      setRoundPoints(0);
      setMessage(null);
      setFeedback(null);
      setClipReady(false);
      setPhase('playing');
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'No se pudo preparar la partida.');
    } finally {
      setStarting(false);
    }
  }

  async function playPreview() {
    const audio = audioRef.current;
    if (!audio) return;
    setMessage(null);
    setClipReady(false);
    resetAudioElement(audio);
    try {
      await audio.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
      setMessage('No se pudo reproducir la preview. Comprueba el volumen y toca de nuevo.');
    }
  }

  function stopPreview() {
    audioRef.current?.pause();
    setPlaying(false);
  }

  function stopSpeedAndAnswer() {
    audioRef.current?.pause();
    setPlaying(false);
    setClipReady(true);
    setMessage(null);
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (isSpeedMode) return;
    if (!audio || audio.currentTime < clipSeconds) return;
    audio.pause();
    setPlaying(false);
    setClipReady(true);
  }

  function listenMore() {
    if (isSpeedMode || clipIndex >= SOLO_MUSICAL_CLIP_STEPS.length - 1) return;
    setClipIndex((current) => current + 1);
    setClipReady(false);
    setMessage(null);
    setFeedback(null);
    setGuess(EMPTY_GUESS);
  }

  function submitGuess() {
    if (!track) return;
    const artist = guess.artist.trim();
    const title = guess.title.trim();
    if (!title || (requiresArtist && !artist)) {
      setMessage(
        requiresArtist ? 'Completa artista y canción.' : 'Escribe el título de la canción.',
      );
      return;
    }
    const numericYear = guess.year.trim() ? Number(guess.year) : null;
    if (requiresYear && numericYear === null) {
      setMessage('Escribe también el año.');
      return;
    }
    const validYear = numericYear === null || Number.isInteger(numericYear);
    if (!validYear) {
      setMessage('El año debe ser un número.');
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const isCorrect = isMusicAnswerCorrect({ artist, title, year: numericYear }, track, answerMode);
    if (isCorrect) {
      const points = pointsForMusicClip(clipIndex);
      setScore((current) => current + points);
      setRoundPoints(points);
      setMessage(null);
      triggerFeedback('correct');
      stopPreview();
      setPhase('reveal');
      return;
    }

    setMessage(null);
    triggerFeedback('incorrect');
  }

  function revealAnswer() {
    stopPreview();
    setRoundPoints(0);
    setClipReady(false);
    setMessage('Respuesta revelada.');
    setPhase('reveal');
  }

  function nextTrack() {
    if (currentIndex + 1 >= selectedTracks.length) {
      setPhase('finished');
      return;
    }
    setCurrentIndex((current) => current + 1);
    setClipIndex(0);
    setGuess(EMPTY_GUESS);
    setAttempts(0);
    setRoundPoints(0);
    setMessage(null);
    setFeedback(null);
    setPhase('playing');
  }

  if (phase === 'setup') {
    return (
      <main className="app-page safe-page mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 px-5">
        <BackToGames />
        <header className="flex flex-col gap-2">
          <span className="eyebrow">Modo solo · Musical</span>
          <h1 className="font-display text-40 leading-display text-crema">Pon a prueba el oído</h1>
          <p className="max-w-xl text-16 text-humo">
            Configura el tipo de música. Las canciones se escogerán al azar y no verás ninguna pista
            antes de escucharla.
          </p>
        </header>

        <section className="surface-panel flex flex-col gap-5 p-5">
          <SegmentedControl
            legend="Canciones de la partida"
            helperText="Elige entre 5 y 50 canciones sin repetir."
            value={rounds}
            onChange={setRounds}
            options={[5, 10, 15, 20, 30, 40, 50].map((value) => ({
              value,
              label: String(value),
            }))}
          />
          <SegmentedControl
            legend="Cómo escuchar"
            helperText="En segundos podrás avanzar de 1 a 3, 5, 10 y 30 s si no la reconoces."
            value={listenMode}
            onChange={setListenMode}
            options={[
              { value: 'velocidad' as const, label: 'Velocidad' },
              { value: 'segundos' as const, label: '1 · 3 · 5 · 10 · 30 s' },
            ]}
          />
          <SegmentedControl
            legend="Estilo"
            helperText="La selección se genera sin mostrar canciones."
            value={filters.genre}
            onChange={(genre) => setFilters((current) => ({ ...current, genre }))}
            options={MUSICAL_GENRE_OPTIONS.map(({ value, label }) => ({ value, label }))}
          />
          <MusicYearRangeControl
            yearFrom={filters.yearFrom}
            yearTo={filters.yearTo}
            onChange={(yearFrom, yearTo) =>
              setFilters((current) => ({ ...current, yearFrom, yearTo }))
            }
          />
          <MusicRegionSelector
            value={filters.regions}
            onChange={(regions) => setFilters((current) => ({ ...current, regions }))}
          />
          <SegmentedControl
            legend="Popularidad"
            helperText="Prioriza éxitos o mezcla resultados."
            value={filters.popularity}
            onChange={(popularity) => setFilters((current) => ({ ...current, popularity }))}
            options={MUSICAL_POPULARITY_OPTIONS.map(({ value, label }) => ({ value, label }))}
          />
          <SegmentedControl
            legend="Qué hay que acertar"
            helperText="Configura los datos obligatorios de cada respuesta."
            value={answerMode}
            onChange={setAnswerMode}
            options={MUSICAL_ANSWER_MODE_OPTIONS.map(({ value, label }) => ({ value, label }))}
          />
          <p className="rounded-xl border border-oro/35 bg-oro/10 px-3 py-2 text-14 text-oro">
            Filtros elegidos: {musicFiltersLabel(filters)}
          </p>
        </section>

        {setupError ? <p className="text-14 text-brasa">{setupError}</p> : null}

        <Button onClick={() => void startGame()} loading={starting}>
          {starting ? 'Preparando canciones…' : 'Empezar partida'}
        </Button>
        <p className="text-center text-12 text-humo">
          Las previews se cargan desde iTunes. Los títulos y artistas solo aparecen después de
          corregir.
        </p>
      </main>
    );
  }

  if (phase === 'finished') {
    return (
      <main className="app-page safe-page mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-5 text-center">
        <span className="eyebrow">Partida terminada</span>
        <h1 className="font-display text-40 leading-display text-crema">Buen oído</h1>
        <p className="text-20 text-hueso">
          Has conseguido <span className="font-mono text-oro">{score}</span> puntos.
        </p>
        <p className="text-14 text-humo">
          {selectedTracks.length} canciones · hasta 5 puntos por acierto temprano
        </p>
        <div className="flex w-full flex-col gap-3">
          <Button onClick={() => setPhase('setup')}>Jugar otra vez</Button>
          <Link href="/juegos/musical" className="text-14 text-oro underline">
            Volver a Musical
          </Link>
        </div>
      </main>
    );
  }

  if (!track) return null;

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-2xl flex-col gap-5 px-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <span className="eyebrow">Musical · Solo</span>
          <p className="mt-1 font-mono text-12 text-humo">
            Canción {currentIndex + 1}/{selectedTracks.length}
          </p>
        </div>
        <span className="rounded-full border border-oro/50 bg-oro/10 px-3 py-1 font-mono text-14 text-oro">
          {score} puntos
        </span>
      </header>

      <section className="surface-panel flex flex-col gap-5 p-5">
        <div className="flex items-center gap-4">
          <span
            className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-oro/40 bg-madera-clara text-40 text-oro"
            aria-hidden="true"
          >
            ♪
          </span>
          <div className="min-w-0">
            <span className="text-12 uppercase tracking-wider text-humo">Fragmento actual</span>
            <h1 className="mt-1 text-20 font-semibold text-hueso">
              {isSpeedMode ? 'Escucha y para cuando quieras' : `Fragmento ${clipIndex + 1}/5 · ${soloClipLabel(clipSeconds)}`}
            </h1>
            <p className="mt-1 text-14 text-humo">
              {attempts} {attempts === 1 ? 'intento' : 'intentos'} · {pointsForMusicClip(clipIndex)}{' '}
              puntos si aciertas ahora
            </p>
          </div>
        </div>

        <audio
          key={track.id}
          ref={audioRef}
          src={musicPreviewUrl(track.previewUrl)}
          preload="auto"
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setPlaying(false);
            setClipReady(true);
          }}
          onError={() => {
            setPlaying(false);
            setMessage('La preview no se pudo cargar. Prueba otra canción.');
          }}
          aria-label="Preview de la canción"
          className="hidden"
        />
        <div className="flex gap-2">
          {isSpeedMode ? (
            <Button
              onClick={clipReady ? playPreview : playing ? stopSpeedAndAnswer : playPreview}
              className="flex-1"
            >
              {clipReady
                ? '▶ Escuchar de nuevo'
                : playing
                  ? '⏹ Parar y responder'
                  : '▶ Empezar a escuchar'}
            </Button>
          ) : (
            <Button onClick={playing ? stopPreview : playPreview} className="flex-1">
              {playing
                ? 'Pausar'
                : clipReady
                  ? `▶ Repetir ${soloClipLabel(clipSeconds)}`
                  : `▶ Escuchar ${soloClipLabel(clipSeconds)}`}
            </Button>
          )}
          {!isSpeedMode && nextClipSeconds !== null ? (
            <Button variant="ghost" onClick={listenMore}>
              No me la sé · {soloClipLabel(nextClipSeconds)}
            </Button>
          ) : null}
        </div>
        <p className="text-12 text-humo">
          Preview proporcionada por iTunes
          {phase === 'reveal' ? (
            <>
              {' · '}
              <a
                href={track.storeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-oro underline"
              >
                Ver canción en la tienda
              </a>
            </>
          ) : null}
        </p>
      </section>

      {feedback ? (
        <MusicalFeedback
          key={`${feedback}-${feedbackNonce}`}
          kind={feedback}
          points={feedback === 'correct' ? roundPoints : undefined}
        />
      ) : null}

      {phase === 'playing' && clipReady ? (
        <form
          className="surface-panel flex flex-col gap-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            submitGuess();
          }}
        >
          <div>
            <h2 className="text-20 font-semibold text-hueso">¿Cuál es?</h2>
            <p className="mt-1 text-14 text-humo">
              {requiresArtist
                ? 'Escribe artista y canción; puedes elegir una sugerencia.'
                : 'Escribe el título; puedes elegir una sugerencia.'}
            </p>
            {!isSpeedMode && nextClipSeconds !== null ? (
              <p className="mt-2 text-13 text-oro">
                Si no la reconoces, pulsa «No me la sé» para escuchar el siguiente fragmento.
              </p>
            ) : null}
          </div>
          {requiresArtist ? (
            <MusicAutocompleteInput
              field="artist"
              label="Artista"
              value={guess.artist}
              onChange={(artist) => setGuess((current) => ({ ...current, artist }))}
              placeholder="Por ejemplo, A…"
            />
          ) : null}
          <MusicAutocompleteInput
            field="title"
            label="Canción"
            value={guess.title}
            onChange={(title) => setGuess((current) => ({ ...current, title }))}
            placeholder="Nombre de la canción"
          />
          {requiresYear ? (
            <label className="flex flex-col gap-1.5 text-14 font-semibold text-hueso">
              Año
              <input
                required
                type="number"
                value={guess.year}
                onChange={(event) =>
                  setGuess((current) => ({ ...current, year: event.target.value }))
                }
                className="form-control px-4 text-16"
                inputMode="numeric"
                maxLength={4}
                placeholder="2020"
              />
            </label>
          ) : null}
          <Button
            type="submit"
            disabled={!guess.title.trim() || (requiresArtist && !guess.artist.trim())}
          >
            Corregir
          </Button>
          {!isSpeedMode && clipIndex === SOLO_MUSICAL_CLIP_STEPS.length - 1 ? (
            <button type="button" onClick={revealAnswer} className="text-14 text-humo underline">
              Revelar respuesta
            </button>
          ) : null}
        </form>
      ) : phase === 'playing' ? (
        <section className="surface-panel flex flex-col items-center gap-3 p-5 text-center">
          <span className="text-32 text-oro" aria-hidden="true">
            {isSpeedMode ? '⏱' : '♪'}
          </span>
          <h2 className="text-20 font-semibold text-hueso">
            {isSpeedMode ? 'Escucha el fragmento' : `Escucha ${soloClipLabel(clipSeconds)}`}
          </h2>
          <p className="text-14 text-humo">
            {isSpeedMode
              ? 'Cuando reconozcas la canción, pulsa “Parar y responder”.'
              : `La respuesta se desbloquea al terminar ${soloClipLabel(clipSeconds)}. Si no la sabes, puedes pasar al siguiente fragmento.`}
          </p>
        </section>
      ) : (
        <section className="surface-panel flex flex-col gap-4 p-5">
          <div>
            <span className="text-12 uppercase tracking-wider text-humo">Respuesta</span>
            <h2 className="mt-1 text-28 font-semibold text-crema">{track.title}</h2>
            <p className="text-16 text-hueso">{track.artist}</p>
            <p className="text-14 text-humo">{track.year ?? 'Año no disponible'}</p>
          </div>
          {message ? <p className="text-14 text-oro">{message}</p> : null}
          <Button onClick={nextTrack}>
            {currentIndex + 1 >= selectedTracks.length ? 'Ver resultado' : 'Siguiente canción'}
          </Button>
        </section>
      )}

      {message && phase === 'playing' ? (
        <p className="text-center text-14 text-oro">{message}</p>
      ) : null}
      <p className="text-center text-12 text-humo">Puntuación de esta canción: +{roundPoints}</p>
    </main>
  );
}
