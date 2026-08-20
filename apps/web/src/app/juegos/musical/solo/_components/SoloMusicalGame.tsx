'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BackToGames } from '@/components/ui/BackToGames';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  isMusicAnswerCorrect,
  MUSICAL_CLIP_STEPS,
  pointsForMusicClip,
  searchMusic,
  shuffleTracks,
  SURPRISE_QUERIES,
  type MusicTrack,
} from '@/lib/musical';

type SoloPhase = 'setup' | 'playing' | 'reveal' | 'finished';

interface Guess {
  artist: string;
  title: string;
  year: string;
}

const EMPTY_GUESS: Guess = { artist: '', title: '', year: '' };

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
  const [searchTerm, setSearchTerm] = useState('pop español');
  const [searchResults, setSearchResults] = useState<MusicTrack[]>([]);
  const [selectedTracks, setSelectedTracks] = useState<MusicTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [clipIndex, setClipIndex] = useState(0);
  const [guess, setGuess] = useState<Guess>(EMPTY_GUESS);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [roundPoints, setRoundPoints] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = selectedTracks[currentIndex] ?? null;
  const clipSeconds = MUSICAL_CLIP_STEPS[clipIndex] ?? MUSICAL_CLIP_STEPS[0];

  useEffect(() => {
    void runSearch('pop español', true);
    // Solo se carga una consulta inicial; las búsquedas posteriores dependen
    // de la intención de la persona y no deben ejecutarse automáticamente.
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    resetAudioElement(audio);
    setPlaying(false);
  }, [currentIndex, clipIndex, track?.id]);

  async function runSearch(term: string, silent = false) {
    if (term.trim().length < 2) return;
    setSearching(true);
    setSetupError(null);
    try {
      const results = await searchMusic(term);
      setSearchResults(results);
      if (!results.length && !silent) setSetupError('No encontré previews con esa búsqueda.');
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'No se pudo buscar música.');
    } finally {
      setSearching(false);
    }
  }

  function addTrack(candidate: MusicTrack) {
    setSelectedTracks((current) =>
      current.some((trackItem) => trackItem.id === candidate.id)
        ? current
        : [...current, candidate],
    );
  }

  function removeTrack(trackId: string) {
    setSelectedTracks((current) => current.filter((candidate) => candidate.id !== trackId));
  }

  function addSearchResults() {
    setSelectedTracks((current) => {
      const known = new Set(current.map((candidate) => candidate.id));
      return [...current, ...searchResults.filter((candidate) => !known.has(candidate.id))];
    });
  }

  function startGame() {
    const pool = shuffleTracks(selectedTracks).slice(0, rounds);
    if (pool.length < rounds) {
      setSetupError(`Añade al menos ${rounds} canciones para empezar.`);
      return;
    }
    setSelectedTracks(pool);
    setCurrentIndex(0);
    setClipIndex(0);
    setGuess(EMPTY_GUESS);
    setAttempts(0);
    setScore(0);
    setRoundPoints(0);
    setMessage(null);
    setPhase('playing');
  }

  async function playPreview() {
    const audio = audioRef.current;
    if (!audio) return;
    setMessage(null);
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

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || audio.currentTime < clipSeconds) return;
    audio.pause();
    setPlaying(false);
  }

  function listenMore() {
    if (clipIndex >= MUSICAL_CLIP_STEPS.length - 1) return;
    setClipIndex((current) => current + 1);
    setMessage(null);
  }

  function submitGuess() {
    if (!track || (!guess.artist.trim() && !guess.title.trim())) return;
    const numericYear = guess.year.trim() ? Number(guess.year) : null;
    const validYear = numericYear === null || Number.isInteger(numericYear);
    if (!validYear) {
      setMessage('El año debe ser un número.');
      return;
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    const isCorrect = isMusicAnswerCorrect(
      { artist: guess.artist, title: guess.title, year: numericYear },
      track,
    );
    if (isCorrect) {
      const points = pointsForMusicClip(clipIndex);
      setScore((current) => current + points);
      setRoundPoints(points);
      setMessage(`¡Acertaste! +${points} puntos.`);
      stopPreview();
      setPhase('reveal');
      return;
    }

    setMessage(
      clipIndex < MUSICAL_CLIP_STEPS.length - 1
        ? 'No es. Puedes probar otra vez o escuchar más segundos.'
        : 'No es. Revela la respuesta cuando quieras.',
    );
  }

  function revealAnswer() {
    stopPreview();
    setRoundPoints(0);
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
            Escucha unos segundos, escribe artista y canción, y gana más puntos cuanto antes la
            reconozcas.
          </p>
        </header>

        <section className="surface-panel flex flex-col gap-5 p-5">
          <SegmentedControl
            legend="Canciones de la partida"
            helperText="Puedes preparar 5, 10, 15 o 20 rondas."
            value={rounds}
            onChange={setRounds}
            options={[5, 10, 15, 20].map((value) => ({ value, label: String(value) }))}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="music-search" className="text-16 font-semibold text-hueso">
              Busca un estilo, artista o época
            </label>
            <div className="flex gap-2">
              <input
                id="music-search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void runSearch(searchTerm);
                }}
                className="form-control min-w-0 flex-1 px-4 text-16"
                placeholder="pop español, rock, Shakira…"
                autoComplete="off"
              />
              <Button
                variant="ghost"
                onClick={() => void runSearch(searchTerm)}
                loading={searching}
                className="shrink-0 px-4"
              >
                Buscar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {SURPRISE_QUERIES.slice(0, 4).map((query) => (
                <button
                  key={query}
                  type="button"
                  onClick={() => {
                    setSearchTerm(query);
                    void runSearch(query);
                  }}
                  className="rounded-full border border-linea bg-tinta/35 px-3 py-1.5 text-12 text-humo hover:border-oro/60 hover:text-hueso"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        </section>

        {setupError ? <p className="text-14 text-brasa">{setupError}</p> : null}

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-20 font-semibold text-hueso">Resultados</h2>
            {searchResults.length ? (
              <button type="button" onClick={addSearchResults} className="text-13 text-oro underline">
                Añadir todos
              </button>
            ) : null}
          </div>
          {searching && !searchResults.length ? (
            <p className="text-14 text-humo">Buscando previews…</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {searchResults.slice(0, 12).map((candidate) => {
                const selected = selectedTracks.some((item) => item.id === candidate.id);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => addTrack(candidate)}
                    className={`interactive-surface flex min-h-16 items-center gap-3 p-3 text-left ${
                      selected ? 'border-oro/70 bg-oro/10' : ''
                    }`}
                  >
                    {candidate.artworkUrl ? (
                      <Image
                        src={candidate.artworkUrl}
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-lg object-cover"
                        unoptimized
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-14 font-semibold text-hueso">
                        {candidate.title}
                      </span>
                      <span className="block truncate text-12 text-humo">
                        {candidate.artist} · {candidate.year ?? 'año desconocido'}
                      </span>
                    </span>
                    <span className="text-20 text-oro" aria-hidden="true">
                      {selected ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        <section className="surface-panel flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-20 font-semibold text-hueso">Tu selección</h2>
            <span className="font-mono text-14 text-oro">
              {selectedTracks.length}/{rounds}
            </span>
          </div>
          {selectedTracks.length ? (
            <ul className="flex flex-col gap-2">
              {selectedTracks.map((selectedTrack, index) => (
                <li key={selectedTrack.id} className="flex items-center gap-3 rounded-xl bg-tinta/35 px-3 py-2">
                  <span className="w-5 font-mono text-12 text-humo">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-14 text-hueso">
                    {selectedTrack.artist} · {selectedTrack.title}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeTrack(selectedTrack.id)}
                    className="text-12 text-humo underline hover:text-crema"
                  >
                    Quitar
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-14 text-humo">Toca canciones de los resultados para añadirlas.</p>
          )}
        </section>

        <Button onClick={startGame} disabled={selectedTracks.length < rounds}>
          Empezar partida
        </Button>
        <p className="text-center text-12 text-humo">
          Las previews son cortes promocionales de iTunes. La ficha de cada canción incluye el
          enlace para verla en la tienda.
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
          {track.artworkUrl ? (
            <Image
              src={track.artworkUrl}
              alt=""
              width={96}
              height={96}
              className="h-24 w-24 rounded-2xl object-cover shadow-lg"
              unoptimized
            />
          ) : (
            <span className="grid h-24 w-24 place-items-center rounded-2xl border border-oro/40 bg-madera-clara text-40 text-oro">
              ♪
            </span>
          )}
          <div className="min-w-0">
            <span className="text-12 uppercase tracking-wider text-humo">Fragmento actual</span>
            <h1 className="mt-1 text-20 font-semibold text-hueso">
              Escucha {clipSeconds} segundos
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
          src={track.previewUrl}
          preload="auto"
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setPlaying(false)}
          onError={() => {
            setPlaying(false);
            setMessage('La preview no se pudo cargar. Prueba otra canción.');
          }}
          aria-label="Preview de la canción"
          className="hidden"
        />
        <div className="flex gap-2">
          <Button onClick={playing ? stopPreview : playPreview} className="flex-1">
            {playing ? 'Pausar' : `▶ Escuchar ${clipSeconds} s`}
          </Button>
          {clipIndex < MUSICAL_CLIP_STEPS.length - 1 ? (
            <Button variant="ghost" onClick={listenMore}>
              Más
            </Button>
          ) : null}
        </div>
        <p className="text-12 text-humo">
          Preview proporcionada por iTunes ·{' '}
          <a href={track.storeUrl} target="_blank" rel="noreferrer" className="text-oro underline">
            Ver canción en la tienda
          </a>
        </p>
      </section>

      {phase === 'playing' ? (
        <form
          className="surface-panel flex flex-col gap-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            submitGuess();
          }}
        >
          <div>
            <h2 className="text-20 font-semibold text-hueso">¿Cuál es?</h2>
            <p className="mt-1 text-14 text-humo">Rellena lo que sepas y corrige.</p>
          </div>
          <label className="flex flex-col gap-1.5 text-14 font-semibold text-hueso">
            Artista
            <input
              value={guess.artist}
              onChange={(event) => setGuess((current) => ({ ...current, artist: event.target.value }))}
              className="form-control px-4 text-16"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-14 font-semibold text-hueso">
            Canción
            <input
              value={guess.title}
              onChange={(event) => setGuess((current) => ({ ...current, title: event.target.value }))}
              className="form-control px-4 text-16"
              autoComplete="off"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-14 font-semibold text-hueso">
            Año <span className="font-normal text-humo">(opcional)</span>
            <input
              value={guess.year}
              onChange={(event) => setGuess((current) => ({ ...current, year: event.target.value }))}
              className="form-control px-4 text-16"
              inputMode="numeric"
              maxLength={4}
              placeholder="2020"
            />
          </label>
          <Button type="submit" disabled={!guess.artist.trim() && !guess.title.trim()}>
            Corregir
          </Button>
          {clipIndex === MUSICAL_CLIP_STEPS.length - 1 ? (
            <button type="button" onClick={revealAnswer} className="text-14 text-humo underline">
              Revelar respuesta
            </button>
          ) : null}
        </form>
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

      {message && phase === 'playing' ? <p className="text-center text-14 text-oro">{message}</p> : null}
      <p className="text-center text-12 text-humo">Puntuación de esta canción: +{roundPoints}</p>
    </main>
  );
}
