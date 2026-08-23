// Punto de entrada cliente de /sala/[code]: retoma la sesión si hace falta
// y despacha la pantalla según `view.status`. Contrato P14, ampliado en
// P17 con los límites de conexión/sesión (§6, criterios de aceptación de
// P17): recarga -> resume automático (ya existía, P14); sala cerrada o
// caducada -> pantalla explicativa con "Crear una partida nueva" y token
// borrado (el store ya lo borra solo); expulsión -> mensaje claro y vuelta
// a la portada; servidor caído >30s -> pantalla de reintento; pestaña
// duplicada -> pantalla de aviso, bloqueando el resto de la interfaz.
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRondaStore } from '@/lib/store';
import { emitWithAck, getSocket } from '@/lib/socket';
import { useSingleTabGuard } from '@/lib/useSingleTabGuard';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { ConnectionLostScreen } from '@/components/ui/ConnectionLostScreen';
import { InactiveTabScreen } from '@/components/ui/InactiveTabScreen';
import { GameBriefing } from '@/components/ui/GameBriefing';
import { Icon } from '@/components/ui/Icon';
import { RondaMark } from '@/components/ui/RondaMark';
import { Lobby } from './Lobby';
import { GameScreen } from './GameScreen';
import { RoundEndScreen } from './RoundEndScreen';
import { GameEndScreen } from './GameEndScreen';
import { PochaGameScreen } from './PochaGameScreen';
import { PochaRoundEndScreen } from './PochaRoundEndScreen';
import { MusGameScreen } from './MusGameScreen';
import { MusRoundEndScreen } from './MusRoundEndScreen';
import { MusGameEndScreen } from './MusGameEndScreen';
import { PartyGameScreen } from './PartyGameScreen';
import { MusicalGameScreen } from './MusicalGameScreen';
import { PrecioJustoGameScreen } from './PrecioJustoGameScreen';
import { PrecioJustoGameEndScreen } from './PrecioJustoGameEndScreen';
import { RoadmapGameScreen } from './RoadmapGameScreen';
import { ClassicGameScreen } from './ClassicGameScreen';
import { ClassicRoundEndScreen } from './ClassicRoundEndScreen';
import { RondaGameScreen } from './RondaGameScreen';
import { GranRondaGameScreen } from './GranRondaGameScreen';
import { RondaRoundEndScreen } from './RondaRoundEndScreen';
import { RondaGameEndScreen } from './RondaGameEndScreen';
import { TurnAnnouncement } from './TurnAnnouncement';

export interface SalaClientProps {
  code: string;
}

const PRESENCE_HEARTBEAT_MS = 20_000;

export function SalaClient({ code }: SalaClientProps) {
  const router = useRouter();
  const view = useRondaStore((s) => s.view);
  const roomCode = useRondaStore((s) => s.roomCode);
  const connection = useRondaStore((s) => s.connection);
  const lastError = useRondaStore((s) => s.lastError);
  const serverDown = useRondaStore((s) => s.serverDown);
  const kickedOut = useRondaStore((s) => s.kickedOut);
  const closedReason = useRondaStore((s) => s.closedReason);
  const [resuming, setResuming] = useState(false);
  const [resumeAttempted, setResumeAttempted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [closingRoom, setClosingRoom] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leavingRoom, setLeavingRoom] = useState(false);
  const [briefingAccepted, setBriefingAccepted] = useState(false);
  const [sevenHalfBustRevealRound, setSevenHalfBustRevealRound] = useState<number | null>(null);

  // Pestaña duplicada: se vigila siempre que sepamos en qué sala estamos,
  // incluso mientras se está resumiendo -- no hace falta esperar a `view`.
  const inactiveTab = useSingleTabGuard(code);

  useEffect(() => {
    // Si ya estamos en esta sala (venimos de /crear o /unirse, que ya
    // hicieron createRoom/joinRoom), no hace falta nada más: la vista sigue
    // llegando sola por 'state:view'. Si no (URL directa, recarga de
    // página), se intenta retomar con el token guardado.
    const state = useRondaStore.getState();
    if (state.roomCode === code && state.view) {
      setResumeAttempted(true);
      return;
    }
    setResuming(true);
    void useRondaStore
      .getState()
      .resume(code)
      .finally(() => {
        setResuming(false);
        setResumeAttempted(true);
      });
  }, [code]);

  // La conexión Socket.IO puede sobrevivir a una navegación dentro de la
  // aplicación. Este heartbeat representa que la pestaña sigue mostrando la
  // sala; si la ruta se abandona, el efecto se desmonta y el servidor termina
  // marcando al jugador como desconectado aunque el transporte siga abierto.
  useEffect(() => {
    if (roomCode !== code || connection !== 'online') return;
    const socket = getSocket();
    const beat = () => {
      if (socket.connected) void emitWithAck(socket, 'ping', {});
    };

    beat();
    const handle = window.setInterval(beat, PRESENCE_HEARTBEAT_MS);
    return () => window.clearInterval(handle);
  }, [code, connection, roomCode]);

  const shouldShowBriefing =
    !briefingAccepted && (view?.status === 'lobby' || view?.status === 'playing');
  const sevenHalfBustRevealCandidate =
    view?.kind === 'player' &&
    view.gameId === 'sieteymedia' &&
    (view.status === 'roundEnd' || view.status === 'gameEnd') &&
    view.bustPlayerIds.length > 0
      ? view.round
      : null;

  useEffect(() => {
    if (sevenHalfBustRevealCandidate === null) {
      setSevenHalfBustRevealRound(null);
      return;
    }

    setSevenHalfBustRevealRound(sevenHalfBustRevealCandidate);
    const timeout = window.setTimeout(() => setSevenHalfBustRevealRound(null), 2_200);
    return () => window.clearTimeout(timeout);
  }, [sevenHalfBustRevealCandidate]);

  const showSevenHalfBustReveal =
    sevenHalfBustRevealRound !== null && sevenHalfBustRevealRound === sevenHalfBustRevealCandidate;
  const isPlaying = (view?.status === 'playing' || showSevenHalfBustReveal) && !shouldShowBriefing;
  const usesIntegratedGameHeader =
    isPlaying && (view?.gameId === 'laronda' || view?.gameId === 'granronda');

  // Una partida es una superficie de juego, no una página desplazable. Se
  // bloquea el scroll de la raíz solo mientras se juega; lobby, fin de ronda
  // y fin de partida conservan su scroll normal. `100dvh` sigue la altura
  // realmente visible cuando aparece o desaparece la barra del navegador.
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.toggle('game-active', isPlaying);
    body.classList.toggle('game-active', isPlaying);
    if (isPlaying) window.scrollTo(0, 0);

    return () => {
      root.classList.remove('game-active');
      body.classList.remove('game-active');
    };
  }, [isPlaying]);

  // Contrato P17: "socket caído más de 30s -> pantalla de error con botón
  // de reintento". Se comprueba antes que nada más: si el servidor lleva
  // caído tanto tiempo, ninguna otra pantalla (ni siquiera la de "entrando
  // en la sala...") tiene sentido.
  if (serverDown) {
    return <ConnectionLostScreen />;
  }

  if (inactiveTab) {
    return <InactiveTabScreen />;
  }

  if (kickedOut) {
    return (
      <main className="app-page flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <RondaMark compact />
        <p className="text-16 text-hueso">El anfitrión te ha sacado de la sala.</p>
        <Link
          href="/"
          className="primary-action flex min-h-14 items-center justify-center gap-2 rounded-[18px] px-6 text-16 font-semibold text-white"
        >
          <Icon name="arrow-left" size={18} /> Volver al inicio
        </Link>
      </main>
    );
  }

  if (closedReason) {
    return (
      <main className="app-page flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <RondaMark compact />
        <p className="text-16 text-hueso">La sala {code} ya no está disponible.</p>
        <p className="text-14 text-humo">
          {closedReason === 'expired'
            ? 'Llevaba demasiado tiempo sin actividad.'
            : 'Se ha cerrado.'}
        </p>
        <Link
          href="/juegos"
          className="primary-action flex min-h-14 items-center justify-center gap-2 rounded-[18px] px-6 text-16 font-semibold text-white"
        >
          <Icon name="plus" size={18} /> Crear una partida nueva
        </Link>
        <Link href="/" className="text-14 text-humo underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  if (!view || roomCode !== code) {
    if (resuming || !resumeAttempted) {
      return (
        <main className="app-page flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <RondaMark compact />
          <p className="text-16 text-humo">Entrando en la sala…</p>
        </main>
      );
    }
    return (
      <main className="app-page flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <RondaMark compact />
        <p className="text-16 text-hueso">No se pudo entrar en la sala {code}.</p>
        {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}
        <Link href={`/unirse/${code}`} className="text-14 font-semibold text-oro underline">
          Unirse con un apodo
        </Link>
        <Link href="/" className="text-14 text-humo underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  if (view.kind !== 'player') {
    // /sala/[code] siempre entra con token de jugador (createRoom/joinRoom/
    // resume): una TableView solo puede llegar aquí por un error de estado.
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-16 text-hueso">Esta pantalla es solo para jugadores.</p>
        <Link href="/" className="mt-4 text-14 text-humo underline">
          Volver al inicio
        </Link>
      </main>
    );
  }

  const isHost = view.players.find((p) => p.playerId === view.me.playerId)?.isHost ?? false;

  async function handleCloseRoom() {
    setClosingRoom(true);
    await useRondaStore.getState().closeRoom();
    setClosingRoom(false);
    setConfirmClose(false);
  }

  async function handleLeaveRoom() {
    setLeavingRoom(true);
    await useRondaStore.getState().leave();
    router.replace('/');
  }

  return (
    <div
      className={
        isPlaying
          ? 'flex h-dvh min-h-0 max-h-dvh flex-col overflow-hidden overscroll-none'
          : 'flex min-h-dvh flex-col'
      }
    >
      <Banner status={connection} className="shrink-0" />
      {isPlaying && !usesIntegratedGameHeader ? (
        <div className="liquid-glass liquid-glass--strong flex shrink-0 justify-end border-x-0 border-t-0 px-3 py-1">
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            aria-label="Salir de la partida"
            title="Salir de la partida"
            className="glass-button !size-8 !min-h-8 !gap-0 !rounded-full !p-0 text-humo"
          >
            <Icon name="arrow-left" size={16} />
            <span className="sr-only">Salir</span>
          </button>
        </div>
      ) : null}
      {!shouldShowBriefing && view.status === 'lobby' ? (
        <div className="flex shrink-0 items-center justify-between px-4 py-2">
          <button
            type="button"
            onClick={() => setConfirmLeave(true)}
            className="shrink-0 text-12 text-humo underline"
          >
            Salir de la sala
          </button>
          {isHost ? (
            <button
              type="button"
              onClick={() => setConfirmClose(true)}
              className="shrink-0 text-12 text-humo underline"
            >
              Cerrar sala
            </button>
          ) : null}
        </div>
      ) : null}
      {shouldShowBriefing ? (
        <GameBriefing gameId={view.gameId} onComplete={() => setBriefingAccepted(true)} />
      ) : null}
      {!shouldShowBriefing && view.status === 'lobby' ? (
        <Lobby view={view} onReviewRules={() => setBriefingAccepted(false)} />
      ) : null}
      {!shouldShowBriefing && view.status === 'playing' && view.gameId === 'chinchon' ? (
        <GameScreen view={view} />
      ) : null}
      {!shouldShowBriefing && view.status === 'playing' && view.gameId === 'pocha' ? (
        <PochaGameScreen view={view} />
      ) : null}
      {!shouldShowBriefing && view.status === 'playing' && view.gameId === 'mus' ? (
        <MusGameScreen view={view} />
      ) : null}
      {!shouldShowBriefing && view.status === 'playing' && view.gameId === 'laronda' ? (
        <RondaGameScreen view={view} onRequestLeave={() => setConfirmLeave(true)} />
      ) : null}
      {!shouldShowBriefing &&
      (view.status === 'playing' || view.status === 'gameEnd') &&
      view.gameId === 'granronda' ? (
        <GranRondaGameScreen view={view} onRequestLeave={() => setConfirmLeave(true)} />
      ) : null}
      {!shouldShowBriefing && view.status === 'playing' && view.gameId === 'musical' ? (
        <MusicalGameScreen view={view} />
      ) : null}
      {!shouldShowBriefing && view.status === 'playing' && view.gameId === 'preciojusto' ? (
        <PrecioJustoGameScreen view={view} />
      ) : null}
      {!shouldShowBriefing &&
      view.status === 'playing' &&
      (view.gameId === 'banderas' ||
        view.gameId === 'cifras' ||
        view.gameId === 'quienloharia' ||
        view.gameId === 'completalafrase') ? (
        <RoadmapGameScreen view={view} />
      ) : null}
      {!shouldShowBriefing &&
      (view.status === 'playing' || showSevenHalfBustReveal) &&
      (view.gameId === 'brisca' ||
        view.gameId === 'escoba' ||
        view.gameId === 'sieteymedia' ||
        view.gameId === 'tute' ||
        view.gameId === 'cinquillo') ? (
        <ClassicGameScreen view={view} />
      ) : null}
      {!shouldShowBriefing &&
      view.status === 'playing' &&
      (view.gameId === 'orden' ||
        view.gameId === 'colores' ||
        view.gameId === 'mayoria' ||
        view.gameId === 'escala' ||
        view.gameId === 'matiz') ? (
        <PartyGameScreen view={view} />
      ) : null}
      {view.status === 'roundEnd' && view.gameId === 'chinchon' ? (
        <RoundEndScreen view={view} />
      ) : null}
      {view.status === 'roundEnd' && view.gameId === 'pocha' ? (
        <PochaRoundEndScreen view={view} />
      ) : null}
      {view.status === 'roundEnd' && view.gameId === 'mus' ? (
        <MusRoundEndScreen view={view} />
      ) : null}
      {view.status === 'roundEnd' && view.gameId === 'laronda' ? (
        <RondaRoundEndScreen view={view} />
      ) : null}
      {view.status === 'roundEnd' && view.gameId === 'sieteymedia' && !showSevenHalfBustReveal ? (
        <ClassicRoundEndScreen view={view} />
      ) : null}
      {/* Mus tiene su propio fin de partida: GameEndScreen ordena por `score`
          y corona a `winnerId`, y en Mus los dos van a 0 y a null porque gana
          una pareja (§12.12). */}
      {view.status === 'gameEnd' && view.gameId === 'mus' ? <MusGameEndScreen view={view} /> : null}
      {view.status === 'gameEnd' && view.gameId === 'laronda' ? (
        <RondaGameEndScreen view={view} />
      ) : null}
      {view.status === 'gameEnd' && view.gameId === 'preciojusto' ? (
        <PrecioJustoGameEndScreen view={view} />
      ) : null}
      {view.status === 'gameEnd' &&
      view.gameId !== 'mus' &&
      view.gameId !== 'laronda' &&
      view.gameId !== 'granronda' &&
      view.gameId !== 'preciojusto' &&
      !showSevenHalfBustReveal ? (
        <GameEndScreen view={view} />
      ) : null}
      <TurnAnnouncement
        active={!shouldShowBriefing && view.status === 'playing'}
        myPlayerId={view.me.playerId}
        turnPlayerId={view.turnPlayerId}
      />
      <Sheet open={confirmClose} onClose={() => setConfirmClose(false)}>
        <div className="flex flex-col gap-4">
          <p className="text-16 text-hueso">¿Cerrar la sala para todos?</p>
          <p className="text-14 text-humo">
            Termina la partida ahora mismo para el resto de jugadores. No se puede deshacer.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setConfirmClose(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleCloseRoom}
              loading={closingRoom}
              className="flex-1"
            >
              Cerrar sala
            </Button>
          </div>
        </div>
      </Sheet>
      <Sheet
        open={confirmLeave}
        onClose={() => {
          if (!leavingRoom) setConfirmLeave(false);
        }}
        ariaLabel="Confirmar salida de la partida"
      >
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-20 font-semibold text-hueso">¿Salir al menú inicial?</p>
            <p className="mt-2 text-14 text-humo">
              Abandonarás esta sala y no podrás retomarla con esta sesión.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setConfirmLeave(false)}
              disabled={leavingRoom}
              className="flex-1"
            >
              Seguir jugando
            </Button>
            <Button
              variant="danger"
              onClick={handleLeaveRoom}
              loading={leavingRoom}
              className="flex-1"
            >
              Salir al inicio
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
