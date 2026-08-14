'use client';

import type { RondaPlayerView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { formatEuros } from '@/lib/ronda';
import { useRondaStore } from '@/lib/store';

export function RondaRoundEndScreen({ view }: { view: RondaPlayerView }) {
  const result = view.roundResult;
  const requester = view.players.find((player) => player.playerId === result?.requesterId);

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5">
      <header className="text-center">
        <p className="eyebrow">Fin de la ronda {view.round}</p>
        <h1 className="mt-2 font-display text-32 text-hueso">La cuenta está pagada</h1>
        {result ? <p className="mt-2 text-16 text-humo">Total: <span className="font-mono text-oro">{formatEuros(result.totalCents)}</span></p> : null}
      </header>

      {result ? (
        <section className="surface-panel flex flex-col gap-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-14 text-humo">La pidió {requester?.nick ?? 'alguien'}</span>
            <Pill>{result.mode === 'solo' ? 'Pago individual' : result.mode === 'half' ? 'A medias' : 'Entre todos'}</Pill>
          </div>
          <ul className="flex flex-col gap-2">
            {result.payments.map((payment) => {
              const player = view.players.find((candidate) => candidate.playerId === payment.playerId);
              return (
                <li key={payment.playerId} className="flex items-center gap-3 rounded-xl border border-linea bg-tinta/35 px-3 py-2">
                  {player ? <Avatar name={player.nick} colorIndex={player.colorIndex} size={34} /> : null}
                  <span className="min-w-0 flex-1 truncate text-14 text-hueso">{player?.nick ?? 'Jugador'}</span>
                  <span className="text-right font-mono text-13 text-hueso">−{formatEuros(payment.amountCents)}<br /><span className="text-oro">{formatEuros(payment.balanceCents)}</span></span>
                </li>
              );
            })}
          </ul>
          {result.handIncrease > 0 ? <p className="text-13 text-humo">La próxima mano de {requester?.nick ?? 'quien pidió la cuenta'} crece en una carta.</p> : null}
        </section>
      ) : null}

      <Button className="mt-auto" onClick={() => void useRondaStore.getState().sendAction({ type: 'nextRound' })}>Siguiente ronda</Button>
    </main>
  );
}
