// Punto de entrada cliente de /mesa/[code]: emite screen:attach y despacha
// la pantalla según `view.status`. Contrato P15.
//
// Nota de alcance sobre `view.me`: este componente SÍ toca el tipo unión
// `PlayerView | TableView` que expone el store (es genérico para ambos
// tipos de cliente), pero solo para leer `view.kind` y descartar cualquier
// vista que no sea 'table' -- nunca lee `view.me` (ese campo ni siquiera
// existe en TableView). A partir de aquí, todos los componentes hijos
// (MesaLobbyBoard, MesaGameBoard, MesaRoundEndScreen, MesaGameEndScreen)
// reciben la vista ya estrechada al tipo `TableView`, no a la unión: si
// alguno intentara `view.me`, no compilaría. El test de
// no-me-access.test.ts comprueba además, por texto fuente, que ningún
// fichero de este directorio contiene la cadena `.me`.
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { TableView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { Banner } from '@/components/ui/Banner';
import { ConnectionLostScreen } from '@/components/ui/ConnectionLostScreen';
import { ReactionOverlay } from '@/components/ui/ReactionOverlay';
import { CornerCode } from './CornerCode';
import { MesaLobbyBoard } from './MesaLobbyBoard';
import { MesaGameBoard } from './MesaGameBoard';
import { MesaRoundEndScreen } from './MesaRoundEndScreen';
import { MesaGameEndScreen } from './MesaGameEndScreen';
import { PochaMesaGameBoard } from './PochaMesaGameBoard';
import { PochaMesaRoundEndScreen } from './PochaMesaRoundEndScreen';
import { MusMesaGameBoard } from './MusMesaGameBoard';
import { MusMesaRoundEndScreen } from './MusMesaRoundEndScreen';
import { MusMesaGameEndScreen } from './MusMesaGameEndScreen';
import { PartyMesaGameBoard } from './PartyMesaGameBoard';
import { ClassicMesaGameBoard } from './ClassicMesaGameBoard';

export interface MesaClientProps {
  code: string;
}

export function MesaClient({ code }: MesaClientProps) {
  const view = useRondaStore((s) => s.view);
  const roomCode = useRondaStore((s) => s.roomCode);
  const connection = useRondaStore((s) => s.connection);
  const lastError = useRondaStore((s) => s.lastError);
  const serverDown = useRondaStore((s) => s.serverDown);
  const closedReason = useRondaStore((s) => s.closedReason);
  const [attaching, setAttaching] = useState(false);
  const [attachAttempted, setAttachAttempted] = useState(false);

  useEffect(() => {
    const state = useRondaStore.getState();
    if (state.roomCode === code && state.view?.kind === 'table') {
      setAttachAttempted(true);
      return;
    }
    setAttaching(true);
    void useRondaStore
      .getState()
      .attachScreen(code)
      .finally(() => {
        setAttaching(false);
        setAttachAttempted(true);
      });
  }, [code]);

  if (serverDown) {
    return <ConnectionLostScreen />;
  }

  if (!view || view.kind !== 'table' || roomCode !== code) {
    if (attaching || !attachAttempted) {
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-16 text-humo">Conectando con la sala…</p>
        </main>
      );
    }
    if (closedReason) {
      return (
        <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-16 text-hueso">La sala {code} ya no está disponible.</p>
          <Link href="/mesa" className="text-14 text-brasa underline">
            Probar con otro código
          </Link>
        </main>
      );
    }
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-16 text-hueso">No se pudo mostrar la sala {code}.</p>
        {lastError ? <p className="text-14 text-brasa">{lastError}</p> : null}
        <Link href="/mesa" className="text-14 text-brasa underline">
          Probar con otro código
        </Link>
      </main>
    );
  }

  // A partir de aquí `view` está estrechada a TableView (kind === 'table').
  const tableView: TableView = view;

  // TableView es, desde P22, unión discriminada por `gameId` (motor de
  // Pocha). MesaLobbyBoard y MesaGameEndScreen ya son genéricos (leen solo
  // campos comunes); MesaGameBoard/MesaRoundEndScreen son de Chinchón, con
  // sus equivalentes de Pocha al lado.
  return (
    <div className="relative flex min-h-dvh flex-col bg-tinta">
      <Banner status={connection} />
      {/* La pantalla central recibe las reacciones pero no las manda: aquí
          no hay ReactionBar, solo el overlay (roadmap "Después del MVP" §2).
          Es la pantalla donde más gracia tienen, y sigue sin accionar nada. */}
      <ReactionOverlay variant="mesa" />
      {tableView.status !== 'lobby' ? <CornerCode view={tableView} /> : null}
      {tableView.status === 'lobby' ? <MesaLobbyBoard view={tableView} /> : null}
      {tableView.status === 'playing' && tableView.gameId === 'chinchon' ? (
        <MesaGameBoard view={tableView} />
      ) : null}
      {tableView.status === 'playing' && tableView.gameId === 'pocha' ? (
        <PochaMesaGameBoard view={tableView} />
      ) : null}
      {tableView.status === 'roundEnd' && tableView.gameId === 'chinchon' ? (
        <MesaRoundEndScreen view={tableView} />
      ) : null}
      {tableView.status === 'roundEnd' && tableView.gameId === 'pocha' ? (
        <PochaMesaRoundEndScreen view={tableView} />
      ) : null}
      {tableView.status === 'playing' && tableView.gameId === 'mus' ? (
        <MusMesaGameBoard view={tableView} />
      ) : null}
      {tableView.status === 'playing' &&
      (tableView.gameId === 'brisca' ||
        tableView.gameId === 'escoba' ||
        tableView.gameId === 'sieteymedia' ||
        tableView.gameId === 'tute' ||
        tableView.gameId === 'cinquillo') ? (
        <ClassicMesaGameBoard view={tableView} />
      ) : null}
      {tableView.status === 'playing' &&
      (tableView.gameId === 'orden' ||
        tableView.gameId === 'colores' ||
        tableView.gameId === 'mayoria' ||
        tableView.gameId === 'escala') ? (
        <PartyMesaGameBoard view={tableView} />
      ) : null}
      {tableView.status === 'roundEnd' && tableView.gameId === 'mus' ? (
        <MusMesaRoundEndScreen view={tableView} />
      ) : null}
      {/* Mus tiene su propio fin de partida: gana una pareja, no un jugador
          con la puntuación más baja (§12.12). */}
      {tableView.status === 'gameEnd' && tableView.gameId === 'mus' ? (
        <MusMesaGameEndScreen view={tableView} />
      ) : null}
      {tableView.status === 'gameEnd' && tableView.gameId !== 'mus' ? (
        <MesaGameEndScreen view={tableView} />
      ) : null}
    </div>
  );
}
