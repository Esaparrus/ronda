'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction, MusicalPlayerView } from '@ronda/protocol';
import { Button } from '@/components/ui/Button';
import { MusicAutocompleteInput } from '@/components/ui/MusicAutocompleteInput';
import { MusicalFeedback } from '@/components/ui/MusicalFeedback';
import {
  musicFiltersLabel,
  musicPreviewUrl,
  pickRandomMusicTracks,
  type MusicFilters,
  type MusicTrack,
} from '@/lib/musical';
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
  onAction?: (action: GameAction) => void;
}

function sendMusicalAction(action: GameAction): void {
  void useRondaStore.getState().sendAction(action);
}

interface GuessForm {
  artist: string;
  title: string;
  year: string;
}

type GuessField = 'artist' | 'title';

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

function formatElapsed(milliseconds: number | null | undefined): string {
  if (milliseconds === null || milliseconds === undefined) return '—';
  return `${(milliseconds / 1000).toFixed(1)} s`;
}

export function MusicalGameScreen({ view, onAction }: MusicalGameScreenProps) {
  const dispatch = onAction ?? sendMusicalAction;
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const lastError = useRondaStore((state) => state.lastError);
  const [guess, setGuess] = useState<GuessForm>(EMPTY_GUESS);
  const [message, setMessage] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [startingClip, setStartingClip] = useState(false);
  const [clipReady, setClipReady] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<MusicalFeedbackKind | null>(null);
  const [feedbackNonce, setFeedbackNonce] = useState(0);
  const [selectionRetry, setSelectionRetry] = useState(0);
  const playlistKeyRef = useRef<string | null>(null);
  const playlistPromiseKeyRef = useRef<string | null>(null);
  const selectedTrackKeyRef = useRef<string | null>(null);
  const playlistRef = useRef<MusicTrack[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousPhaseRef = useRef(view.phase);
  const previousGuessCountRef = useRef(view.guessCounts[view.me.playerId] ?? 0);

  const isHost =
    view.players.find((player) => player.playerId === view.me.playerId)?.isHost ?? false;
  const currentTrack = view.currentTrack;
  const myGuessCount = view.guessCounts[view.me.playerId] ?? 0;
  const isOnlineMode = view.config.audioMode === 'online';
  const isBlocked = view.blockedPlayerIds.includes(view.me.playerId);
  const isSpeedMode = view.config.mode === 'velocidad';
  const canGiveUp = view.me.availableActions.includes('musicGiveUp');
  const requiresArtist = view.config.answerMode !== 'title';
  const requiresYear = view.config.answerMode === 'artist_title_year';
  const sharedSpeedClaimed = !isOnlineMode && isSpeedMode && view.buzzedPlayerId !== null;
  const buzzedPlayerNick = view.players.find(
    (player) => player.playerId === view.buzzedPlayerId,
  )?.nick;
  const hasGuessFields =
    Boolean(guess.title.trim()) && (!requiresArtist || Boolean(guess.artist.trim()));
  const canSubmitGuess = hasGuessFields && (!requiresYear || Boolean(guess.year.trim()));
  const filters: MusicFilters = {
    genre: view.config.genre,
    popularity: view.config.popularity,
    yearFrom: view.config.yearFrom,
    yearTo: view.config.yearTo,
    regions: view.config.regions,
  };
  const regionsKey = view.config.regions.join(',');

  useEffect(() => {
    if (view.phase !== 'setup' || !isHost) return;
    const playlistKey = `${filters.genre}:${filters.yearFrom}:${filters.yearTo}:${filters.popularity}:${regionsKey}:${view.config.rounds}`;
    if (playlistKeyRef.current !== playlistKey) {
      playlistKeyRef.current = playlistKey;
      playlistPromiseKeyRef.current = null;
      selectedTrackKeyRef.current = null;
      playlistRef.current = [];
    }

    const sendTrack = (track: MusicTrack, round: number) => {
      const selectionKey = `${playlistKey}:${round}:${track.id}`;
      if (selectedTrackKeyRef.current === selectionKey) return;
      selectedTrackKeyRef.current = selectionKey;
      dispatch({
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
    };

    const readyTrack = playlistRef.current[view.round - 1];
    if (readyTrack) {
      sendTrack(readyTrack, view.round);
      return;
    }
    if (playlistPromiseKeyRef.current === playlistKey) return;
    playlistPromiseKeyRef.current = playlistKey;
    let cancelled = false;
    setSelecting(true);
    setSelectionError(null);

    void pickRandomMusicTracks(filters, view.config.rounds)
      .then((playlist) => {
        if (cancelled) return;
        playlistRef.current = playlist;
        const track = playlist[view.round - 1];
        if (track) sendTrack(track, view.round);
      })
      .catch((error) => {
        if (cancelled) return;
        playlistPromiseKeyRef.current = null;
        setSelectionError(
          error instanceof Error ? error.message : 'No se pudo preparar la canción.',
        );
      })
      .finally(() => {
        if (!cancelled) setSelecting(false);
      });

    return () => {
      cancelled = true;
      if (playlistPromiseKeyRef.current === playlistKey) {
        playlistPromiseKeyRef.current = null;
      }
    };
  }, [
    filters.genre,
    filters.popularity,
    filters.yearFrom,
    filters.yearTo,
    isHost,
    regionsKey,
    selectionRetry,
    dispatch,
    view.config.rounds,
    view.phase,
    view.round,
  ]);

  useEffect(() => {
    setGuess(EMPTY_GUESS);
    setMessage(null);
    setFeedback(null);
    setClipReady(false);
    const audio = audioRef.current;
    if (audio) resetAudioElement(audio);
    setPlaying(false);
  }, [view.round, view.clipIndex, currentTrack?.id]);

  useEffect(() => {
    if (view.phase === 'playing') return;
    audioRef.current?.pause();
    setPlaying(false);
  }, [view.phase]);

  useEffect(() => {
    setClipReady(false);
    if (isOnlineMode) {
      setClipReady(view.me.onlineClipResolvedAt !== null);
      return;
    }
    if (view.clipStartedAt === null) return;

    // En modo simultáneo todos reciben la misma marca de tiempo del servidor.
    // Así el formulario se desbloquea aunque solo el móvil del anfitrión tenga
    // el audio reproduciéndose.
    if (isSpeedMode) {
      setClipReady(true);
      return;
    }

    const remaining = view.clipStartedAt + view.clipSeconds * 1000 - Date.now();
    const timer = window.setTimeout(() => setClipReady(true), Math.max(0, remaining));
    return () => window.clearTimeout(timer);
  }, [
    isOnlineMode,
    isSpeedMode,
    view.clipSeconds,
    view.clipStartedAt,
    view.me.onlineClipResolvedAt,
  ]);

  useEffect(() => {
    if (isOnlineMode || !isSpeedMode || view.buzzedPlayerId === null) return;
    // Solo el móvil del anfitrión reproduce el audio, pero todos reciben el
    // mismo estado. Al aceptar el primer pulsador, el anfitrión lo detiene.
    audioRef.current?.pause();
    setPlaying(false);
  }, [isOnlineMode, isSpeedMode, view.buzzedPlayerId]);

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

  async function playPreview(): Promise<boolean> {
    const audio = audioRef.current;
    if (!audio) return false;
    setMessage(null);
    resetAudioElement(audio);
    try {
      await audio.play();
      setPlaying(true);
      return true;
    } catch {
      setPlaying(false);
      setMessage('No se pudo reproducir la preview. Toca de nuevo y comprueba el volumen.');
      return false;
    }
  }

  async function startClipForPlayer() {
    if (startingClip) return;
    setStartingClip(true);
    setMessage(null);
    try {
      // El play nace de un gesto del usuario, así que el navegador permite el
      // audio tanto en el móvil del anfitrión como en el de cada jugador online.
      const started = await playPreview();
      if (started) {
        await dispatch({ type: 'musicStartClip' });
      }
    } finally {
      setStartingClip(false);
    }
  }

  function resolveClipForPlayer() {
    if (pendingAction) return;
    stopPreview();
    setClipReady(true);
    setMessage(null);
    dispatch({ type: 'musicResolveClip' });
  }

  function stopPreview() {
    audioRef.current?.pause();
    setPlaying(false);
  }

  function handleTimeUpdate() {
    const audio = audioRef.current;
    if (!audio || isOnlineMode || isSpeedMode || audio.currentTime < view.clipSeconds) return;
    audio.pause();
    setPlaying(false);
    setClipReady(true);
  }

  function submitGuess() {
    const artist = guess.artist.trim();
    const title = guess.title.trim();
    if (!title || (requiresArtist && !artist)) {
      setMessage(
        requiresArtist ? 'Completa artista y canción.' : 'Escribe el título de la canción.',
      );
      return;
    }
    const year = guess.year.trim() ? Number(guess.year) : null;
    if (requiresYear && year === null) {
      setMessage('Escribe también el año.');
      return;
    }
    if (year !== null && !Number.isInteger(year)) {
      setMessage('El año debe ser un número.');
      return;
    }
    prepareMusicalFeedbackAudio();
    setMessage(null);
    dispatch({
      type: 'musicSubmitGuess',
      artist,
      title,
      year,
    });
  }

  function updateGuessField(field: GuessField, value: string) {
    setGuess((current) => ({ ...current, [field]: value }));
  }

  function buzz() {
    if (pendingAction) return;
    if (!isOnlineMode) stopPreview();
    setMessage(null);
    prepareMusicalFeedbackAudio();
    dispatch({ type: 'musicBuzz' });
  }

  function nextClip() {
    stopPreview();
    dispatch({ type: 'musicNextClip' });
  }

  function giveUpAndReveal() {
    if (pendingAction) return;
    stopPreview();
    setMessage(null);
    dispatch({ type: 'musicGiveUp' });
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
                    setSelectionError(null);
                    setSelectionRetry((current) => current + 1);
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
                  ? isOnlineMode
                    ? 'Escucha hasta saberla'
                    : isSpeedMode
                      ? 'Escucha la preview completa'
                      : `Escucha ${view.clipSeconds} segundos`
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
            src={musicPreviewUrl(currentTrack.previewUrl)}
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
          {view.phase === 'playing' ? (
            <div className="flex gap-2">
              {sharedSpeedClaimed ? (
                <>
                  <p className="flex flex-1 items-center justify-center rounded-2xl border border-oro/40 bg-oro/10 px-4 py-3 text-center text-13 text-oro">
                    Audio detenido ·{' '}
                    {view.buzzedPlayerId === view.me.playerId
                      ? 'tu turno para responder'
                      : `${buzzedPlayerNick ?? 'Otro jugador'} está respondiendo`}
                  </p>
                  {canGiveUp ? (
                    <Button
                      variant="ghost"
                      onClick={giveUpAndReveal}
                      className="min-w-0 flex-1 px-3 text-14"
                      loading={pendingAction}
                    >
                      No la sé · ver canción
                    </Button>
                  ) : null}
                </>
              ) : isOnlineMode ? (
                isBlocked ? (
                  <p className="flex flex-1 items-center justify-center rounded-2xl border border-brasa/50 bg-brasa/10 px-4 py-3 text-center text-13 text-brasa">
                    {view.me.revealedAnswer
                      ? 'Has revelado la canción: espera al resto'
                      : 'Respuesta incorrecta: estás fuera de esta canción'}
                  </p>
                ) : view.me.onlineClipStartedAt === null ? (
                  <>
                    <Button
                      onClick={startClipForPlayer}
                      className="min-w-0 flex-1 px-3 text-14"
                      loading={pendingAction || startingClip}
                      disabled={playing}
                    >
                      ▶ Escuchar en tu móvil
                    </Button>
                    {canGiveUp ? (
                      <Button
                        variant="ghost"
                        onClick={giveUpAndReveal}
                        className="min-w-0 flex-1 px-3 text-14"
                        loading={pendingAction}
                      >
                        No la sé · ver canción
                      </Button>
                    ) : null}
                  </>
                ) : view.me.onlineClipResolvedAt === null ? (
                  <>
                    <p className="flex flex-1 items-center justify-center rounded-2xl border border-oro/40 bg-oro/10 px-4 py-3 text-center text-13 text-oro">
                      Audio activo · usa el pulsador grande para resolver
                    </p>
                    {canGiveUp ? (
                      <Button
                        variant="ghost"
                        onClick={giveUpAndReveal}
                        className="min-w-0 flex-1 px-3 text-14"
                        loading={pendingAction}
                      >
                        No la sé · ver canción
                      </Button>
                    ) : null}
                  </>
                ) : view.me.availableActions.includes('musicSubmitGuess') ? (
                  <>
                    <p className="flex flex-1 items-center justify-center rounded-2xl border border-linea bg-tinta/35 px-4 py-3 text-center text-13 text-humo">
                      Tiempo registrado: {formatElapsed(view.me.onlineClipElapsedMs)}
                    </p>
                    {canGiveUp ? (
                      <Button
                        variant="ghost"
                        onClick={giveUpAndReveal}
                        className="min-w-0 flex-1 px-3 text-14"
                        loading={pendingAction}
                      >
                        No la sé · ver canción
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <p className="flex flex-1 items-center justify-center rounded-2xl border border-verde/40 bg-verde/10 px-4 py-3 text-center text-13 text-verde">
                    Respuesta enviada · tiempo: {formatElapsed(view.me.onlineClipElapsedMs)}
                  </p>
                )
              ) : isHost ? (
                <>
                  <Button
                    onClick={view.clipStartedAt === null ? startClipForPlayer : playPreview}
                    className="min-w-0 flex-1 px-3 text-14"
                    loading={view.clipStartedAt === null && (pendingAction || startingClip)}
                    disabled={playing}
                  >
                    {view.clipStartedAt === null
                      ? '▶ Reproducir para todos'
                      : playing
                        ? 'Reproduciendo…'
                        : '▶ Reproducir de nuevo'}
                  </Button>
                  {canGiveUp ? (
                    <Button
                      variant="ghost"
                      onClick={giveUpAndReveal}
                      className="min-w-0 flex-1 px-3 text-14"
                      loading={pendingAction}
                    >
                      No la sé · ver canción
                    </Button>
                  ) : null}
                </>
              ) : (
                <>
                  <p className="flex flex-1 items-center justify-center rounded-2xl border border-linea bg-tinta/35 px-4 py-3 text-center text-13 text-humo">
                    El anfitrión controla la música. Cuando pulse play, se activará vuestro
                    pulsador.
                  </p>
                  {canGiveUp ? (
                    <Button
                      variant="ghost"
                      onClick={giveUpAndReveal}
                      className="min-w-0 flex-1 px-3 text-14"
                      loading={pendingAction}
                    >
                      No la sé · ver canción
                    </Button>
                  ) : null}
                </>
              )}
              {view.me.availableActions.includes('musicNextClip') && !sharedSpeedClaimed ? (
                <Button
                  variant="ghost"
                  onClick={nextClip}
                  loading={pendingAction}
                  disabled={pendingAction || (!isOnlineMode && view.clipStartedAt === null)}
                >
                  {isOnlineMode || isSpeedMode
                    ? 'Revelar'
                    : view.clipIndex >= 3
                      ? 'Revelar'
                      : 'Más segundos'}
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
          isOnlineMode && !isBlocked && view.me.onlineClipStartedAt === null ? (
            <section className="surface-panel flex flex-col items-center gap-2 p-5 text-center">
              <span className="text-32 text-oro" aria-hidden="true">
                ♪
              </span>
              <h2 className="text-20 font-semibold text-hueso">Pulsa Play cuando estés listo</h2>
              <p className="text-14 text-humo">
                La misma canción está preparada para todos. El cronómetro empezará en tu móvil.
              </p>
            </section>
          ) : isOnlineMode && isBlocked ? (
            <section className="surface-panel flex flex-col items-center gap-2 p-5 text-center">
              <span className="text-32 text-oro" aria-hidden="true">
                {view.me.revealedAnswer ? '♪' : '✕'}
              </span>
              <h2 className="text-20 font-semibold text-hueso">
                {view.me.revealedAnswer ? 'Era esta' : 'Respuesta incorrecta'}
              </h2>
              {view.me.revealedAnswer ? (
                <div className="rounded-2xl border border-oro/45 bg-oro/10 px-4 py-3">
                  <strong className="block text-18 text-hueso">
                    {view.me.revealedAnswer.title}
                  </strong>
                  <span className="mt-1 block text-14 text-humo">
                    {view.me.revealedAnswer.artist}
                    {view.me.revealedAnswer.year ? ` · ${view.me.revealedAnswer.year}` : ''}
                  </span>
                </div>
              ) : null}
              <p className="text-14 text-humo">
                Tu intento ha terminado. La canción sigue para quienes aún están jugando.
              </p>
            </section>
          ) : isOnlineMode && view.me.onlineClipResolvedAt === null ? (
            <section className="surface-panel flex flex-col items-center gap-4 p-5 text-center">
              <div>
                <span className="text-32 text-oro" aria-hidden="true">
                  ⏱
                </span>
                <h2 className="mt-2 text-20 font-semibold text-hueso">¿Te la sabes?</h2>
                <p className="mt-1 text-14 text-humo">
                  La música seguirá hasta que pulses el botón. El tiempo se registra al resolver.
                </p>
              </div>
              <button
                type="button"
                onClick={resolveClipForPlayer}
                disabled={pendingAction}
                aria-label="Resolver y responder"
                className="primary-action grid min-h-40 w-40 place-items-center rounded-full border-4 border-white/35 px-5 text-center text-20 font-bold uppercase tracking-wide text-white shadow-xl transition-transform active:translate-y-1 active:shadow-lg disabled:cursor-wait disabled:opacity-60"
              >
                {pendingAction ? '…' : 'Resolver'}
              </button>
              <p className="text-12 text-humo">Después podrás escribir artista y canción.</p>
            </section>
          ) : !isOnlineMode && isBlocked ? (
            <section className="surface-panel flex flex-col items-center gap-2 p-5 text-center">
              <span className="text-32 text-brasa" aria-hidden="true">
                {view.me.revealedAnswer ? '♪' : '✕'}
              </span>
              <h2 className="text-20 font-semibold text-hueso">
                {view.me.revealedAnswer ? 'Era esta' : 'Te has quedado fuera'}
              </h2>
              {view.me.revealedAnswer ? (
                <div className="rounded-2xl border border-oro/45 bg-oro/10 px-4 py-3">
                  <strong className="block text-18 text-hueso">
                    {view.me.revealedAnswer.title}
                  </strong>
                  <span className="mt-1 block text-14 text-humo">
                    {view.me.revealedAnswer.artist}
                    {view.me.revealedAnswer.year ? ` · ${view.me.revealedAnswer.year}` : ''}
                  </span>
                </div>
              ) : null}
              <p className="text-14 text-humo">
                {view.me.revealedAnswer
                  ? 'Has revelado la canción. Los demás siguen jugando esta canción.'
                  : 'Tu respuesta no era correcta. Los demás siguen jugando esta canción.'}
              </p>
            </section>
          ) : !isOnlineMode && view.clipStartedAt === null ? (
            <section className="surface-panel flex flex-col items-center gap-2 p-5 text-center">
              <span className="text-32 text-oro" aria-hidden="true">
                ♪
              </span>
              <h2 className="text-20 font-semibold text-hueso">Esperando al anfitrión</h2>
              <p className="text-14 text-humo">
                {isHost
                  ? 'Pulsa «Reproducir para todos» cuando estéis listos.'
                  : 'El anfitrión tiene que pulsar play para que empiece la competición.'}
              </p>
            </section>
          ) : !isOnlineMode && isSpeedMode && view.buzzedPlayerId === null ? (
            <section className="surface-panel flex flex-col items-center gap-4 p-5 text-center">
              <div>
                <h2 className="text-20 font-semibold text-hueso">¿La sabes?</h2>
                <p className="mt-1 text-14 text-humo">
                  Pulsa primero y podrás escribir la respuesta.
                </p>
              </div>
              <button
                type="button"
                onClick={buzz}
                disabled={pendingAction}
                aria-label="Pulsar para responder"
                className="primary-action grid min-h-40 w-40 place-items-center rounded-full border-4 border-white/35 px-5 text-center text-20 font-bold uppercase tracking-wide text-white shadow-xl transition-transform active:translate-y-1 active:shadow-lg disabled:cursor-wait disabled:opacity-60"
              >
                {pendingAction ? '…' : '¡La sé!'}
              </button>
            </section>
          ) : !isOnlineMode && isSpeedMode && view.buzzedPlayerId !== view.me.playerId ? (
            <section className="surface-panel flex flex-col items-center gap-2 p-5 text-center">
              <span className="text-32 text-oro" aria-hidden="true">
                ⏳
              </span>
              <h2 className="text-20 font-semibold text-hueso">Alguien se ha adelantado</h2>
              <p className="text-14 text-humo">Espera a ver si acierta.</p>
            </section>
          ) : !isOnlineMode && !isSpeedMode && !clipReady ? (
            <section className="surface-panel flex flex-col gap-2 p-5 text-center">
              <h2 className="text-20 font-semibold text-hueso">Escuchad el fragmento</h2>
              <p className="text-14 text-humo">
                Cuando terminen los {view.clipSeconds} segundos, todos podréis responder.
              </p>
            </section>
          ) : (
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
                  {isOnlineMode
                    ? 'Has parado tu audio. Escribe tu respuesta y corrígela.'
                    : isSpeedMode
                      ? 'Ya tienes el pulsador. Escribe tu respuesta y corrígela.'
                      : 'Escribe artista y canción; aceptamos coincidencias aproximadas.'}
                </p>
              </div>
              {requiresArtist ? (
                <MusicAutocompleteInput
                  field="artist"
                  label="Artista"
                  value={guess.artist}
                  onChange={(artist) => updateGuessField('artist', artist)}
                  placeholder="Por ejemplo, A…"
                />
              ) : null}
              <MusicAutocompleteInput
                field="title"
                label="Canción"
                value={guess.title}
                onChange={(title) => updateGuessField('title', title)}
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
              <div className="grid">
                <Button type="submit" disabled={!canSubmitGuess} loading={pendingAction}>
                  Corregir
                </Button>
              </div>
            </form>
          )
        ) : view.roundResult ? (
          <section className="surface-panel flex flex-col gap-4 p-5">
            <div>
              <span className="text-12 uppercase tracking-wider text-humo">Era esta</span>
              <h2 className="mt-1 text-28 font-semibold text-crema">{view.roundResult.title}</h2>
              <p className="text-16 text-hueso">{view.roundResult.artist}</p>
              <p className="text-14 text-humo">
                {view.roundResult.year ?? 'Año no disponible'} ·{' '}
                {view.roundResult.winnerId
                  ? `${view.players.find((player) => player.playerId === view.roundResult?.winnerId)?.nick ?? 'Alguien'} gana +${view.roundResult.points}${isOnlineMode ? ` · ${formatElapsed(view.roundResult.responseTimes[view.roundResult.winnerId])}` : ''}`
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
                      {isOnlineMode && view.roundResult?.responseTimes[player.playerId] !== null
                        ? ` · ${formatElapsed(view.roundResult?.responseTimes[player.playerId] ?? null)}`
                        : null}
                    </span>
                  </div>
                );
              })}
            </div>
            {view.status === 'playing' && isHost ? (
              <Button onClick={() => dispatch({ type: 'musicNextRound' })} loading={pendingAction}>
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
