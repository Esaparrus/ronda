'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { MusicalPlayerView } from '@ronda/protocol';
import { Button } from '@/components/ui/Button';
import { MusicAutocompleteInput } from '@/components/ui/MusicAutocompleteInput';
import { MusicalFeedback } from '@/components/ui/MusicalFeedback';
import { musicFiltersLabel, pickRandomMusicTracks, type MusicFilters } from '@/lib/musical';
import {
  playMusicalFeedback,
  prepareMusicalFeedbackAudio,
  type MusicalFeedbackKind,
} from '@/lib/musical-feedback';
import { useRondaStore } from '@/lib/store';
import { PlayerStrip } from './PlayerStrip';
import { TableHeader } from './TableHeader';

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
  const [guess, setGuess] = useState<GuessForm>(EMPTY_GUESS);
  const [message, setMessage] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<MusicalFeedbackKind | null>(null);
  const [feedbackNonce, setFeedbackNonce] = useState(0);
  const selectionKeyRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousPhaseRef = useRef(view.phase);
  const previousGuessCountRef = useRef(view.guessCounts[view.me.playerId] ?? 0);

  const isHost =
    view.players.find((player) => player.playerId === view.me.playerId)?.isHost ?? false;
  const currentTrack = view.currentTrack;
  const myGuessCount = view.guessCounts[view.me.playerId] ?? 0;
  const filters: MusicFilters = {
    genre: view.config.genre,
    decade: view.config.decade,
    popularity: view.config.popularity,
  };

  useEffect(() => {
    if (view.phase !== 'setup' || !isHost) return;
    const selectionKey = `${view.round}:${filters.genre}:${filters.decade}:${filters.popularity}`;
    if (selectionKeyRef.current === selectionKey) return;
    selectionKeyRef.current = selectionKey;
    let cancelled = false;
    setSelecting(true);
    setSelectionError(null);

    void pickRandomMusicTracks(filters, 1)
      .then(([track]) => {
        if (cancelled || !track) return;
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
      })
      .catch((error) => {
        if (cancelled) return;
        selectionKeyRef.current = null;
        setSelectionError(
          error instanceof Error ? error.message : 'No se pudo preparar la canción.',
        );
      })
      .finally(() => {
        if (!cancelled) setSelecting(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters.decade, filters.genre, filters.popularity, isHost, view.phase, view.round]);

  useEffect(() => {
    setGuess(EMPTY_GUESS);
    setMessage(null);
    setFeedback(null);
    const audio = audioRef.current;
    if (audio) resetAudioElement(audio);
    setPlaying(false);
  }, [view.round, view.clipIndex, currentTrack?.id]);

  const triggerFeedback = useCallback((kind: MusicalFeedbackKind) => {
    setFeedback(kind);
    setFeedbackNonce((current) => current + 1);
    playMusicalFeedback(kind);
  }, []);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    const previousGuessCount = previousGuessCountRef.current;
    const roundWasWonByMe = view.roundResult?.winnerId === view.me.playerId;

    if (previousPhase === 'playing' && myGuessCount > previousGuessCount) {
      triggerFeedback(view.phase === 'reveal' && roundWasWonByMe ? 'correct' : 'incorrect');
    } else if (previousPhase === 'playing' && view.phase === 'reveal' && roundWasWonByMe) {
      triggerFeedback('correct');
    }

    previousPhaseRef.current = view.phase;
    previousGuessCountRef.current = myGuessCount;
  }, [myGuessCount, triggerFeedback, view.me.playerId, view.phase, view.round, view.roundResult]);

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
    prepareMusicalFeedbackAudio();
    setMessage(null);
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
        <TableHeader
          left={`Musical · canción ${view.round}/${view.config.rounds}`}
          turnNick={null}
        />
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
            <h1 className="text-28 font-semibold text-crema">Preparando una canción</h1>
            <p className="text-14 text-humo">
              {isHost
                ? selecting
                  ? 'Buscando una canción al azar según los filtros…'
                  : 'La siguiente canción se ha preparado automáticamente.'
                : 'El anfitrión está preparando una canción al azar.'}
            </p>
            <p className="text-12 text-humo">Filtros: {musicFiltersLabel(filters)}</p>
            <p className="text-12 text-humo">
              Las canciones no se muestran antes de empezar el clip.
            </p>
          </section>
          {selectionError ? (
            <section className="surface-panel flex flex-col gap-3 p-4 text-center">
              <p className="text-14 text-brasa">{selectionError}</p>
              {isHost ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    selectionKeyRef.current = null;
                    setSelectionError(null);
                  }}
                >
                  Reintentar
                </Button>
              ) : null}
            </section>
          ) : null}
          {scores}
        </main>
      </div>
    );
  }

  if (!currentTrack) return null;

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-y-auto">
      <TableHeader left={`Musical · ronda ${view.round}/${view.config.rounds}`} turnNick={null} />
      <PlayerStrip
        players={view.players}
        turnPlayerId={null}
        myPlayerId={view.me.playerId}
        renderInfo={(player) => `${player.score} puntos`}
      />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-6">
        <section className="surface-panel flex flex-col gap-5 p-5">
          <div className="flex items-center gap-4">
            <span
              className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl border border-oro/40 bg-madera-clara text-40 text-oro"
              aria-hidden="true"
            >
              ♪
            </span>
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
            Preview proporcionada por iTunes
            {view.phase === 'reveal' && view.roundResult?.storeUrl ? (
              <>
                {' · '}
                <a
                  href={view.roundResult.storeUrl}
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
            points={feedback === 'correct' ? view.roundResult?.points : undefined}
          />
        ) : null}

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
              <p className="mt-1 text-14 text-humo">
                Escribe y elige una sugerencia; gana el primer acierto.
              </p>
            </div>
            <MusicAutocompleteInput
              field="artist"
              label="Artista"
              value={guess.artist}
              onChange={(artist) => setGuess((current) => ({ ...current, artist }))}
              placeholder="Por ejemplo, A…"
            />
            <MusicAutocompleteInput
              field="title"
              label="Canción"
              value={guess.title}
              onChange={(title) => setGuess((current) => ({ ...current, title }))}
              placeholder="Nombre de la canción"
            />
            <label className="flex flex-col gap-1.5 text-14 font-semibold text-hueso">
              Año <span className="font-normal text-humo">(opcional)</span>
              <input
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
                  <div
                    key={player.playerId}
                    className="flex items-center justify-between gap-3 rounded-xl bg-tinta/35 px-3 py-2 text-14"
                  >
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
