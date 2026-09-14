// Fin de partida de Mus. No puede reutilizar GameEndScreen.tsx porque esa
// pantalla ordena una clasificación por `score` y corona a `winnerId`, y en
// Mus las dos cosas van siempre a 0 y a null: gana una PAREJA (§12.12).
//
// El caso sin pareja ganadora también se pinta: si alguien abandona a mitad,
// la partida se anula (decisión 6 de P28) y no cuenta en las estadísticas.
// Decirlo es mejor que enseñar un ganador que no existe.
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { MusPlayerView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { StatsPanel } from '@/components/ui/StatsPanel';
import { useRondaStore } from '@/lib/store';
import { pendingConfirmations } from '@/lib/pending';

export interface MusGameEndScreenProps {
  view: MusPlayerView;
}

export function MusGameEndScreen({ view }: MusGameEndScreenProps) {
  const router = useRouter();
  const [voting, setVoting] = useState(false);

  const winnerTeam = view.winnerTeamIndex;
  const iWon = winnerTeam !== null && winnerTeam === view.me.teamIndex;
  const iVoted = view.rematchVotes.includes(view.me.playerId);
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);

  async function handleToggleRematch() {
    setVoting(true);
    await useRondaStore.getState().voteRematch(!iVoted);
    setVoting(false);
  }

  async function handleExit() {
    await useRondaStore.getState().leave();
    router.push('/');
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-28 leading-display text-hueso">Partida terminada</h1>
        {winnerTeam !== null ? (
          <p className="text-20 text-hueso">
            Gana la pareja {winnerTeam === 0 ? 'A' : 'B'}
            {iWon ? ' — la tuya' : ''}
          </p>
        ) : (
          <p className="text-16 text-humo">
            La partida se ha quedado sin cuatro jugadores y queda anulada. No cuenta en las
            estadísticas.
          </p>
        )}
        <p className="text-14 text-humo">
          {view.round} {view.round === 1 ? 'mano' : 'manos'}
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {view.teams.map((team) => {
          const members = view.players
            .filter((p) => p.teamIndex === team.index)
            .sort((a, b) => a.seat - b.seat);
          return (
            <li
              key={team.index}
              className={`flex flex-col gap-2 rounded-lg border bg-mesa px-3 py-3 ${
                team.index === winnerTeam ? 'border-brasa' : 'border-linea'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-16 font-semibold text-hueso">
                  Pareja {team.index === 0 ? 'A' : 'B'}
                </span>
                {team.index === winnerTeam ? <Pill>Ganadora</Pill> : null}
                <span className="font-mono text-16 text-hueso">
                  {view.config.juegos > 1
                    ? `${team.juegos} ${team.juegos === 1 ? 'juego' : 'juegos'}`
                    : `${team.piedras} piedras`}
                </span>
              </div>
              <div className="flex flex-wrap gap-3">
                {members.map((p) => (
                  <span key={p.playerId} className="flex items-center gap-2">
                    <Avatar name={p.nick} colorIndex={p.colorIndex} size={28} />
                    <span className="text-14 text-hueso">{p.nick}</span>
                  </span>
                ))}
              </div>
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-2">
        <h2 className="text-20 font-semibold text-hueso">Estadísticas del grupo</h2>
        <StatsPanel refreshKey={`${view.roomCode}-${view.round}`} />
      </section>

      <div className="mt-auto flex flex-col gap-3">
        <Button variant={iVoted ? 'ghost' : 'primary'} onClick={handleToggleRematch} loading={voting}>
          {iVoted ? 'Quitar voto de revancha' : 'Revancha'}
        </Button>
        <p className="text-center text-14 text-humo">
          {iVoted
            ? waitingFor.length > 0
              ? `Esperando a ${waitingFor.map((p) => p.nick).join(', ')}.`
              : 'Empezando la revancha.'
            : `Han votado revancha: ${
                view.rematchVotes.length > 0
                  ? view.players
                      .filter((p) => view.rematchVotes.includes(p.playerId))
                      .map((p) => p.nick)
                      .join(', ')
                  : 'nadie todavía'
              }.`}
        </p>
        <Button variant="ghost" onClick={handleExit}>
          Salir
        </Button>
      </div>
    </main>
  );
}
