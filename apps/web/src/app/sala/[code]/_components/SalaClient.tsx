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
import { ConnectionLostScreen } from '@/components/ui/ConnectionLostScreen';
import { InactiveTabScreen } from '@/components/ui/InactiveTabScreen';
import { Lobby } from './Lobby';
import { GameScreen } from './GameScreen';
import { RoundEndScreen } from './RoundEndScreen';
import { GameEndScreen } from './GameEndScreen';

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
          href="/crear"
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

  // PlayerView es una unión discriminada por `gameId` desde P22 (motor de
  // Pocha). Las cuatro pantallas de abajo (Lobby/GameScreen/RoundEndScreen/
  // GameEndScreen) son, hoy, específicamente de Chinchón -- este es el único
  // sitio donde se estrecha el tipo, para no repetir el guard en cada una.
  // Hoy no se pueden crear salas de Pocha (room-manager.createRoom lo
  // rechaza), así que esta rama nunca se alcanza en la práctica; pantallas
  // de Pocha de verdad son trabajo de P24.
  if (view.gameId !== 'chinchon') {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
        <p className="text-16 text-hueso">Este juego todavía no tiene pantalla.</p>
      </main>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Banner status={connection} />
      {view.status === 'lobby' ? <Lobby view={view} /> : null}
      {view.status === 'playing' ? <GameScreen view={view} /> : null}
      {view.status === 'roundEnd' ? <RoundEndScreen view={view} /> : null}
      {view.status === 'gameEnd' ? <GameEndScreen view={view} /> : null}
    </div>
  );
}
