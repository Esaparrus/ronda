'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { MusicalPlayerView } from '@ronda/protocol';
import { Button } from '@/components/ui/Button';
import { TableHeader } from './TableHeader';
import { PlayerStrip } from './PlayerStrip';
import { useRondaStore } from '@/lib/store';
import { searchMusic, type MusicTrack } from '@/lib/musical';

interface MusicalGameScreenProps {
  view: MusicalPlayerView;
}

interface GuessForm {
  artist: string;
  title: string;
  year: string;
}

const EMPTY_GUESS: GuessForm = { artist: '', title: '', year: '' };

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

export function MusicalGameScreen({ view }: MusicalGameScreenProps) {
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const [searchTerm, setSearchTerm] = useState('pop español');
  const [results, setResults] = useState<MusicTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hostTrack, setHostTrack] = useState<MusicTrack | null>(null);
  const [guess, setGuess] = useState<GuessForm>(EMPTY_GUESS);
  const [message, setMessage] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isHost = view.players.find((player) => player.playerId === view.me.playerId)?.isHost ?? false;
  const currentTrack = view.currentTrack;

  useEffect(() => {
    if (view.phase === 'setup' && isHost && results.length === 0) {
      void runSearch('pop español', true);
    }
    // La búsqueda no depende del snapshot: solo se inicializa al entrar en
    // una pantalla de selección de pista.
  }, [view.phase, isHost]);

  useEffect(() => {
    setGuess(EMPTY_GUESS);
    setMessage(null);
    const audio = audioRef.current;
    if (audio) {
      resetAudioElement(audio);
    }
    setPlaying(false);
  }, [view.round, view.clipIndex, currentTrack?.id]);

  async function runSearch(term: string, silent = false) {
    if (term.trim().length < 2) return;
    setSearching(true);
    setSearchError(null);
    try {
      const nextResults = await searchMusic(term);
      setResults(nextResults);
      if (!nextResults.length && !silent) setSearchError('No encontré previews con esa búsqueda.');
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'No se pudo buscar música.');
    } finally {
      setSearching(false);
    }
  }

  function selectTrack(track: MusicTrack) {
    setHostTrack(track);
    void useRondaStore.getState().sendAction({
      type: 'musicSelectTrack',
      track: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        year: track.year,
        previewUrl: track.previewUrl,
        artworkUrl: track.artworkUrl,
        storeUrl: track.storeUrl,
      },
    });
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
    if (!audio || audio.currentTime < view.clipSeconds) return;
    audio.pause();
    setPlaying(false);
  }

  function submitGuess() {
    const artist = guess.artist.trim();
    const title = guess.title.trim();
    if (!artist && !title) return;
    const year = guess.year.trim() ? Number(guess.year) : null;
    if (year !== null && !Number.isInteger(year)) {
      setMessage('El año debe ser un número.');
      return;
    }
    setMessage('Respuesta enviada.');
    void useRondaStore.getState().sendAction({
      type: 'musicSubmitGuess',
      artist,
      title,
      year,
    });
  }

  function nextClip() {
    stopPreview();
    void useRondaStore.getState().sendAction({ type: 'musicNextClip' });
  }

  const scores = (
    <div className="flex flex-wrap justify-center gap-2">
      {view.players.map((player) => (
        <span
          key={player.playerId}
          className={`rounded-full border px-3 py-1 text-12 ${
            player.playerId === view.me.playerId
              ? 'border-oro/70 bg-oro/10 text-crema'
              : 'border-linea bg-tinta/35 text-humo'
          }`}
        >
          {player.nick}: <span className="font-mono">{player.score}</span>
        </span>
      ))}
    </div>
  );

  if (view.phase === 'setup') {
    return (
      <div className="game-shell flex min-h-0 flex-1 flex-col overflow-y-auto">
        <TableHeader left={`Musical · canción ${view.round}/${view.config.rounds}`} turnNick={null} />
        <PlayerStrip
          players={view.players}
          turnPlayerId={null}
          myPlayerId={view.me.playerId}
          renderInfo={(player) => `${player.score} puntos`}
        />
        <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
          <section className="surface-panel flex flex-col gap-3 p-5 text-center">
            <span className="text-40 text-oro" aria-hidden="true">
              ♪
            </span>
            <h1 className="text-28 font-semibold text-crema">Elige la canción</h1>
            <p className="text-14 text-humo">
              {isHost
                ? 'Busca una preview y cárgala para toda la sala.'
                : 'Espera a que el anfitrión elija una preview.'}
            </p>
            <p className="text-12 text-humo">Modo: {view.config.mode}</p>
          </section>

          {isHost ? (
            <>
              <div className="flex gap-2">
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void runSearch(searchTerm);
                  }}
                  className="form-control min-w-0 flex-1 px-4 text-16"
                  placeholder="artista, estilo o canción"
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
              {searchError ? <p className="text-14 text-brasa">{searchError}</p> : null}
              <div className="grid gap-2 sm:grid-cols-2">
                {results.slice(0, 12).map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => selectTrack(result)}
                    disabled={pendingAction}
                    className="interactive-surface flex min-h-16 items-center gap-3 p-3 text-left transition-[border-color,background-color] hover:border-oro/70"
                  >
                    {result.artworkUrl ? (
                      <Image
                        src={result.artworkUrl}
                        alt=""
                        width={44}
                        height={44}
                        className="h-11 w-11 rounded-lg object-cover"
                        unoptimized
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-14 font-semibold text-hueso">
                        {result.title}
                      </span>
                      <span className="block truncate text-12 text-humo">{result.artist}</span>
                    </span>
                    <span className="text-20 text-oro" aria-hidden="true">
                      +
                    </span>
                  </button>
                ))}
              </div>
              {hostTrack ? (
                <p className="rounded-xl border border-oro/50 bg-oro/10 px-3 py-2 text-14 text-oro">
                  Cargando: {hostTrack.artist} · {hostTrack.title}
                </p>
              ) : null}
            </>
          ) : (
            <p className="rounded-xl border border-linea bg-mesa/60 px-4 py-3 text-center text-16 text-humo">
              El anfitrión está preparando la siguiente ronda…
            </p>
          )}
          {scores}
        </main>
      </div>
    );
  }

  if (!currentTrack) return null;

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-y-auto">
      <TableHeader
        left={`Musical · ronda ${view.round}/${view.config.rounds}`}
        turnNick={null}
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={null}
        myPlayerId={view.me.playerId}
        renderInfo={(player) => `${player.score} puntos`}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <section className="surface-panel flex flex-col gap-5 p-5">
          <div className="flex items-center gap-4">
            {currentTrack.artworkUrl ? (
              <Image
                src={currentTrack.artworkUrl}
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
              <span className="text-12 uppercase tracking-wider text-humo">Fragmento</span>
              <h1 className="mt-1 text-20 font-semibold text-crema">
                {view.phase === 'playing'
                  ? `Escucha ${view.clipSeconds} segundos`
                  : 'Respuesta revelada'}
              </h1>
              {view.phase === 'playing' ? (
                <p className="mt-1 text-14 text-humo">
                  {view.guessCounts[view.me.playerId] ?? 0}{' '}
                  {(view.guessCounts[view.me.playerId] ?? 0) === 1 ? 'intento' : 'intentos'}
                </p>
              ) : null}
            </div>
          </div>

          <audio
            key={currentTrack.id}
            ref={audioRef}
            src={currentTrack.previewUrl}
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
          {view.phase === 'playing' ? (
            <div className="flex gap-2">
              <Button onClick={playing ? stopPreview : playPreview} className="flex-1">
                {playing ? 'Pausar' : `▶ Escuchar ${view.clipSeconds} s`}
              </Button>
              {isHost ? (
                <Button variant="ghost" onClick={nextClip} loading={pendingAction}>
                  {view.clipIndex >= 3 ? 'Revelar' : 'Más segundos'}
                </Button>
              ) : null}
            </div>
          ) : null}
          <p className="text-12 text-humo">
            Preview proporcionada por iTunes ·{' '}
            <a href={currentTrack.storeUrl} target="_blank" rel="noreferrer" className="text-oro underline">
              Ver canción en la tienda
            </a>
          </p>
        </section>

        {view.phase === 'playing' ? (
          <form
            className="surface-panel flex flex-col gap-4 p-5"
            onSubmit={(event) => {
              event.preventDefault();
              submitGuess();
            }}
          >
            <div>
              <h2 className="text-20 font-semibold text-hueso">¿Cuál es?</h2>
              <p className="mt-1 text-14 text-humo">El servidor decide el primer acierto.</p>
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
            <Button
              type="submit"
              disabled={!guess.artist.trim() && !guess.title.trim()}
              loading={pendingAction}
            >
              Corregir
            </Button>
          </form>
        ) : view.roundResult ? (
          <section className="surface-panel flex flex-col gap-4 p-5">
            <div>
              <span className="text-12 uppercase tracking-wider text-humo">Era esta</span>
              <h2 className="mt-1 text-28 font-semibold text-crema">{view.roundResult.title}</h2>
              <p className="text-16 text-hueso">{view.roundResult.artist}</p>
              <p className="text-14 text-humo">
                {view.roundResult.year ?? 'Año no disponible'} ·{' '}
                {view.roundResult.winnerId
                  ? `${view.players.find((player) => player.playerId === view.roundResult?.winnerId)?.nick ?? 'Alguien'} gana +${view.roundResult.points}`
                  : 'Nadie se lleva puntos'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {view.players.map((player) => {
                const guesses = view.roundResult?.guesses[player.playerId] ?? [];
                const lastGuess = guesses[guesses.length - 1];
                return (
                  <div key={player.playerId} className="flex items-center justify-between gap-3 rounded-xl bg-tinta/35 px-3 py-2 text-14">
                    <span className="text-hueso">{player.nick}</span>
                    <span className="text-right text-humo">
                      {lastGuess ? `${lastGuess.artist} · ${lastGuess.title}` : 'Sin respuesta'}
                    </span>
                  </div>
                );
              })}
            </div>
            {view.status === 'playing' && isHost ? (
              <Button
                onClick={() => void useRondaStore.getState().sendAction({ type: 'musicNextRound' })}
                loading={pendingAction}
              >
                Siguiente canción
              </Button>
            ) : view.status === 'playing' ? (
              <p className="text-center text-14 text-humo">Esperando al anfitrión…</p>
            ) : null}
          </section>
        ) : null}

        {message ? <p className="text-center text-14 text-oro">{message}</p> : null}
        {lastError ? <p className="text-center text-14 text-brasa">{lastError}</p> : null}
        {scores}
      </main>
    </div>
  );
}
