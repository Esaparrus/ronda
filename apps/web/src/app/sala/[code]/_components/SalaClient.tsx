// Punto de entrada cliente de /sala/[code]: retoma la sesión si hace falta
// y despacha la pantalla según `view.status`. Contrato P14.
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRondaStore } from '@/lib/store';
import { Banner } from '@/components/ui/Banner';
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
  const [resuming, setResuming] = useState(false);
  const [resumeAttempted, setResumeAttempted] = useState(false);

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
