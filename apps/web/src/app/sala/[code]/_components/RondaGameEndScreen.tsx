'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { RondaPlayerView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { formatEuros } from '@/lib/ronda';
import { useRondaStore } from '@/lib/store';

export function RondaGameEndScreen({ view }: { view: RondaPlayerView }) {
  const router = useRouter();
  const [voting, setVoting] = useState(false);
  const iVoted = view.rematchVotes.includes(view.me.playerId);
  const standings = [...view.players].sort((a, b) => b.score - a.score);
  const winnerNicks = view.players.filter((player) => view.winnerIds.includes(player.playerId)).map((player) => player.nick);

  async function toggleRematch() {
    setVoting(true);
    await useRondaStore.getState().voteRematch(!iVoted);
    setVoting(false);
  }

  async function exitGame() {
    await useRondaStore.getState().leave();
    router.push('/');
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5">
      <header className="text-center">
        <p className="eyebrow">Sobremesa terminada</p>
        <h1 className="mt-2 font-display text-36 text-hueso">{winnerNicks.length > 1 ? 'Victoria compartida' : `Gana ${winnerNicks[0] ?? 'la mesa'}`}</h1>
        <p className="mt-2 text-14 text-humo">Tras {view.round} {view.round === 1 ? 'ronda' : 'rondas'}</p>
      </header>

      <ol className="flex flex-col gap-2">
        {standings.map((player, index) => (
          <li key={player.playerId} className="interactive-surface flex items-center gap-3 px-3 py-2">
            <span className="w-5 text-center font-mono text-13 text-humo">{index + 1}</span>
            <Avatar name={player.nick} colorIndex={player.colorIndex} size={34} />
            <span className="min-w-0 flex-1 truncate text-15 text-hueso">{player.nick}</span>
            {view.winnerIds.includes(player.playerId) ? <Pill>Ganador</Pill> : null}
            <span className="font-mono text-14 text-oro">{formatEuros(player.score)}</span>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex flex-col gap-3">
        <Button variant={iVoted ? 'ghost' : 'primary'} onClick={toggleRematch} loading={voting}>{iVoted ? 'Quitar voto de revancha' : 'Revancha'}</Button>
        <p className="text-center text-13 text-humo">{view.rematchVotes.length} de {view.players.length} han votado.</p>
        <Button variant="ghost" onClick={exitGame}>Salir</Button>
      </div>
    </main>
  );
}
