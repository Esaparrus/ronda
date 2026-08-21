// Fin de partida. Contrato P16: ganador, clasificación final, nº de rondas,
// «Revancha» (rematch:vote, muestra los votos) y «Salir». El ganador va
// primero en la clasificación (un chinchón con chinchonEndsGame puede
// ganar la partida "sea cual sea el marcador", contrato §5.7, así que no
// basta con ordenar por puntuación); el resto se ordena por `score`
// ascendente (menos puntos, mejor, salvo el caso de chinchón ya cubierto
// poniendo al ganador primero).
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ClassicPlayerView, PlayerView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { MiniCardFan } from '@/components/cards/MiniCardFan';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { StatsPanel } from '@/components/ui/StatsPanel';
import { useRondaStore } from '@/lib/store';
import { pendingConfirmations } from '@/lib/pending';

export interface GameEndScreenProps {
  view: PlayerView;
}

export function GameEndScreen({ view }: GameEndScreenProps) {
  const router = useRouter();
  const [voting, setVoting] = useState(false);
  const winner = view.players.find((p) => p.playerId === view.winnerId);
  const rest = view.players
    .filter((p) => p.playerId !== view.winnerId)
    .sort((a, b) => (view.gameId === 'chinchon' ? a.score - b.score : b.score - a.score));
  const standings = winner ? [winner, ...rest] : rest;
  const winningGroupIndex =
    view.gameId === 'escala' && view.config.groupMode === 'groups'
      ? view.party.winnerGroupIndex
      : null;

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
        {view.gameId === 'orden' ? (
          <p className="text-20 text-hueso">La cuadrilla ha completado {view.round} rondas</p>
        ) : view.gameId === 'escala' && winningGroupIndex !== null ? (
          <p className="text-20 text-hueso">Gana el Grupo {groupLetter(winningGroupIndex)}</p>
        ) : winner ? (
          <p className="text-20 text-hueso">Gana {winner.nick}</p>
        ) : null}
        <p className="text-14 text-humo">
          {view.round} {view.round === 1 ? 'ronda' : 'rondas'}
        </p>
      </header>

      <ol className="flex flex-col gap-2">
        {standings.map((p, i) => (
          <li key={p.playerId} className="interactive-surface flex items-center gap-3 px-3 py-2">
            <span className="w-5 text-center font-mono text-14 text-humo">{i + 1}</span>
            <Avatar name={p.nick} colorIndex={p.colorIndex} size={32} />
            <span className="flex-1 text-16 text-hueso">{p.nick}</span>
            {p.playerId === view.winnerId ? (
              <Pill>{winningGroupIndex === null ? 'Ganador' : 'Grupo ganador'}</Pill>
            ) : null}
            {p.eliminated ? <Pill>Eliminado</Pill> : null}
            <span className="font-mono text-16 text-hueso">{p.score}</span>
          </li>
        ))}
      </ol>

      {view.gameId === 'escala' && view.party.groups ? (
        <section className="surface-panel flex flex-col gap-3 p-4">
          <h2 className="text-20 font-semibold text-hueso">Marcador final por grupos</h2>
          <div className="grid grid-cols-2 gap-2">
            {view.party.groups.map((group) => (
              <div
                key={group.index}
                className={`rounded-xl border px-3 py-2 ${
                  group.index === winningGroupIndex
                    ? 'border-oro bg-oro/10'
                    : 'border-linea bg-mesa/70'
                }`}
              >
                <span className="text-14 text-humo">Grupo {groupLetter(group.index)}</span>
                <span className="ml-2 font-mono text-18 text-oro">{group.score}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {view.gameId === 'sieteymedia' ? <SevenHalfFinalHands view={view} /> : null}

      {/* Estadísticas del grupo (roadmap "Después del MVP" §3): aquí van
          desplegadas y no tras un botón, porque este es justo el momento en
          que interesan ("van 3-1"). `refreshKey` con la ronda de esta
          partida fuerza a recargarlas al llegar a esta pantalla. */}
      <section className="flex flex-col gap-2">
        <h2 className="text-20 font-semibold text-hueso">Estadísticas del grupo</h2>
        <StatsPanel refreshKey={`${view.roomCode}-${view.round}`} />
      </section>

      <div className="mt-auto flex flex-col gap-3">
        <Button
          variant={iVoted ? 'ghost' : 'primary'}
          onClick={handleToggleRematch}
          loading={voting}
        >
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

function groupLetter(index: number): string {
  return String.fromCharCode('A'.charCodeAt(0) + index);
}

function SevenHalfFinalHands({ view }: { view: ClassicPlayerView }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-20 font-semibold text-hueso">Manos finales</h2>
      <ul className="seven-half-round-end__list">
        {view.players.map((player, index) => {
          const total = view.totals[index] ?? null;
          const cards =
            view.revealedHands.find((hand) => hand.playerId === player.playerId)?.cards ?? [];
          const result = view.bustPlayerIds.includes(player.playerId)
            ? 'Se pasó'
            : total === 7.5
              ? 'Siete y media'
              : `Plantado · ${total === null ? '—' : String(total).replace('.', ',')}`;
          return (
            <li key={player.playerId} className="seven-half-round-end__player">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate text-15 font-semibold text-hueso">
                  {player.nick}
                </span>
                <span className="font-mono text-12 text-oro">{result}</span>
              </div>
              <div className="seven-half-round-end__cards">
                <MiniCardFan cards={cards} />
                <span className="shrink-0 font-mono text-11 text-humo">Puntos: {player.score}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
