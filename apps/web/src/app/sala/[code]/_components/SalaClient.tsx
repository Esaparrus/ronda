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
import { useEffect, useState } from 'react';
import { useRondaStore } from '@/lib/store';
import { useSingleTabGuard } from '@/lib/useSingleTabGuard';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { ConnectionLostScreen } from '@/components/ui/ConnectionLostScreen';
import { InactiveTabScreen } from '@/components/ui/InactiveTabScreen';
import { ReactionBar } from '@/components/ui/ReactionBar';
import { ReactionOverlay } from '@/components/ui/ReactionOverlay';
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
import { ClassicGameScreen } from './ClassicGameScreen';

export interface SalaClientProps {
  code: string;
}

export function SalaClient({ code }: SalaClientProps) {
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

  const isPlaying = view?.status === 'playing';

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
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-16 text-hueso">El anfitrión te ha sacado de la sala.</p>
        <Link
          href="/"
          className="flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
        >
          Volver a la portada
        </Link>
      </main>
    );
  }

  if (closedReason) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-16 text-hueso">La sala {code} ya no está disponible.</p>
        <p className="text-14 text-humo">
          {closedReason === 'expired'
            ? 'Llevaba demasiado tiempo sin actividad.'
            : 'Se ha cerrado.'}
        </p>
        <Link
          href="/juegos"
          className="flex min-h-14 items-center justify-center rounded-lg bg-brasa px-6 text-16 font-semibold text-hueso"
        >
          Crear una partida nueva
        </Link>
      </main>
    );
  }

  if (!view || roomCode !== code) {
    if (resuming || !resumeAttempted) {
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-16 text-humo">Entrando en la sala…</p>
        </main>
      );
    }
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-16 text-hueso">No se pudo entrar en la sala {code}.</p>
        {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}
        <Link href={`/unirse/${code}`} className="text-14 text-brasa underline">
          Unirse con un apodo
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

  return (
    <div
      className={
        isPlaying
          ? 'flex h-dvh min-h-0 max-h-dvh flex-col overflow-hidden overscroll-none'
          : 'flex min-h-dvh flex-col'
      }
    >
      <Banner status={connection} className="shrink-0" />
      {/* Barra superior: reacciones rápidas a la izquierda (roadmap
          "Después del MVP" §2) y el cierre de sala del anfitrión a la
          derecha. Las reacciones van AQUÍ, y no flotando sobre la mesa,
          para no competir con la regla de "en tu turno solo hay una acción
          principal visible" (00-MASTER.md §8). */}
      <div className="flex shrink-0 items-center justify-between gap-2 px-4 py-1">
        <ReactionBar />
        {isHost && view.status === 'lobby' ? (
          <button
            type="button"
            onClick={() => setConfirmClose(true)}
            className="shrink-0 text-12 text-humo underline"
          >
            Cerrar sala
          </button>
        ) : null}
      </div>
      <ReactionOverlay />
      {view.status === 'lobby' ? <Lobby view={view} /> : null}
      {view.status === 'playing' && view.gameId === 'chinchon' ? <GameScreen view={view} /> : null}
      {view.status === 'playing' && view.gameId === 'pocha' ? (
        <PochaGameScreen view={view} />
      ) : null}
      {view.status === 'playing' && view.gameId === 'mus' ? <MusGameScreen view={view} /> : null}
      {view.status === 'playing' &&
      (view.gameId === 'brisca' ||
        view.gameId === 'escoba' ||
        view.gameId === 'sieteymedia' ||
        view.gameId === 'tute' ||
        view.gameId === 'cinquillo') ? (
        <ClassicGameScreen view={view} />
      ) : null}
      {view.status === 'playing' &&
      (view.gameId === 'orden' ||
        view.gameId === 'colores' ||
        view.gameId === 'mayoria' ||
        view.gameId === 'escala') ? (
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
      {/* Mus tiene su propio fin de partida: GameEndScreen ordena por `score`
          y corona a `winnerId`, y en Mus los dos van a 0 y a null porque gana
          una pareja (§12.12). */}
      {view.status === 'gameEnd' && view.gameId === 'mus' ? <MusGameEndScreen view={view} /> : null}
      {view.status === 'gameEnd' && view.gameId !== 'mus' ? <GameEndScreen view={view} /> : null}
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
    </div>
  );
}
