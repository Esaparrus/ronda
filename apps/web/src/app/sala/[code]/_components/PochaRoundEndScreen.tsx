// Fin de ronda de Pocha. Mismo patrón que RoundEndScreen.tsx (Chinchón):
// tabla tal cual llega en `roundResult`, sin recalcular nada -- pero sin
// manos reveladas (Pocha no las revela, contrato §2.5 final).
'use client';

import { useState } from 'react';
import type { PochaPlayerView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useRondaStore } from '@/lib/store';
import { pendingConfirmations } from '@/lib/pending';

export interface PochaRoundEndScreenProps {
  view: PochaPlayerView;
}

export function PochaRoundEndScreen({ view }: PochaRoundEndScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const result = view.roundResult;

  const iConfirmed = view.rematchVotes.includes(view.me.playerId);
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);

  async function handleNextRound() {
    setConfirming(true);
    await useRondaStore.getState().sendAction({ type: 'nextRound' });
    setConfirming(false);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-6 py-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-28 leading-display text-hueso">Fin de ronda {view.round}</h1>
      </header>

      {result ? (
        <ul className="flex flex-col gap-3">
          {result.rows.map((row) => {
            const player = view.players.find((p) => p.playerId === row.playerId);
            const exact = row.delta > 0;
            return (
              <li
                key={row.playerId}
                className="flex items-center justify-between gap-2 rounded-lg border border-linea bg-mesa p-3"
              >
                <div className="flex items-center gap-2">
                  {player ? <Avatar name={player.nick} colorIndex={player.colorIndex} size={32} /> : null}
                  <span className="text-16 font-semibold text-hueso">{player?.nick ?? row.playerId}</span>
                  <span className="font-mono text-14 text-humo">
                    cantó {row.bid}, ganó {row.tricksWon}
                    {exact ? ' — acertó' : ''}
                  </span>
                </div>
                <span className="font-mono text-16 text-hueso">
                  {row.delta >= 0 ? '+' : ''}
                  {row.delta} · {row.total}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        {iConfirmed ? (
          <p className="text-center text-14 text-humo">
            Confirmado.{' '}
            {waitingFor.length > 0
              ? `Esperando a ${waitingFor.map((p) => p.nick).join(', ')}.`
              : 'Empezando la siguiente ronda.'}
          </p>
        ) : (
          <Button onClick={handleNextRound} loading={confirming}>
            Siguiente ronda
          </Button>
        )}
      </div>
    </main>
  );
}
