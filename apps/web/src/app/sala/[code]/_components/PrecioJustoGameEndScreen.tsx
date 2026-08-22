'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PrecioJustoPlayerView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StatsPanel } from '@/components/ui/StatsPanel';
import { useRondaStore } from '@/lib/store';
import { pendingConfirmations } from '@/lib/pending';

export interface PrecioJustoGameEndScreenProps {
  view: PrecioJustoPlayerView;
}

const EURO = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export function PrecioJustoGameEndScreen({ view }: PrecioJustoGameEndScreenProps) {
  const router = useRouter();
  const [voting, setVoting] = useState(false);
  const winner = view.players.find((player) => player.playerId === view.winnerId);
  const standings = view.players
    .slice()
    .sort((left, right) => right.score - left.score || left.seat - right.seat);
  const voted = view.rematchVotes.includes(view.me.playerId);
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);
  const reference = view.price.referencePriceCents;

  async function toggleRematch() {
    setVoting(true);
    await useRondaStore.getState().voteRematch(!voted);
    setVoting(false);
  }

  async function exit() {
    await useRondaStore.getState().leave();
    router.push('/');
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="eyebrow">Precio justo</p>
        <h1 className="font-display text-32 leading-display text-hueso">Partida terminada</h1>
        <p className="text-18 text-hueso">{winner ? `Gana ${winner.nick}` : 'Partida terminada'}</p>
        <p className="text-14 text-humo">{view.round} rondas · último precio revelado</p>
      </header>

      {reference !== null ? (
        <section className="surface-panel flex flex-col gap-2 p-4 text-center">
          <p className="text-12 uppercase tracking-[0.14em] text-humo">Precio de referencia</p>
          <p className="font-display text-36 text-oro">{formatCents(reference)}</p>
        </section>
      ) : null}

      <ol className="flex flex-col gap-2">
        {standings.map((player, index) => {
          const guess = view.price.guesses?.[player.playerId];
          return (
            <li key={player.playerId} className="interactive-surface flex items-center gap-3 px-3 py-2">
              <span className="w-5 text-center font-mono text-14 text-humo">{index + 1}</span>
              <Avatar name={player.nick} colorIndex={player.colorIndex} size={32} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-16 text-hueso">{player.nick}</span>
                <span className="block text-12 text-humo">
                  {guess?.priceCents === null || guess?.priceCents === undefined
                    ? 'Sin respuesta en la última ronda'
                    : `${formatCents(guess.priceCents)} · error ${formatPercent(guess.relativeErrorPercent)}`}
                </span>
              </span>
              {player.playerId === view.winnerId ? <Pill>Ganador</Pill> : null}
              <span className="font-mono text-16 text-hueso">{player.score}</span>
            </li>
          );
        })}
      </ol>

      <section className="flex flex-col gap-2">
        <h2 className="text-20 font-semibold text-hueso">Estadísticas del grupo</h2>
        <StatsPanel refreshKey={`${view.roomCode}-${view.round}`} />
      </section>

      <div className="mt-auto flex flex-col gap-3">
        <Button variant={voted ? 'ghost' : 'primary'} onClick={toggleRematch} loading={voting}>
          {voted ? 'Quitar voto de revancha' : 'Revancha'}
        </Button>
        <p className="text-center text-14 text-humo">
          {voted
            ? waitingFor.length > 0
              ? `Esperando a ${waitingFor.map((player) => player.nick).join(', ')}.`
              : 'Empezando la revancha.'
            : `Han votado revancha: ${
                view.rematchVotes.length > 0
                  ? view.players
                      .filter((player) => view.rematchVotes.includes(player.playerId))
                      .map((player) => player.nick)
                      .join(', ')
                  : 'nadie todavía'
              }.`}
        </p>
        <Button variant="ghost" onClick={exit}>
          Salir
        </Button>
      </div>
    </main>
  );
}

function formatCents(cents: number): string {
  return EURO.format(cents / 100);
}

function formatPercent(percent: number | null | undefined): string {
  return percent === null || percent === undefined
    ? '—'
    : `${percent.toLocaleString('es-ES', { maximumFractionDigits: 1 })} %`;
}
