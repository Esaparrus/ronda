import type { RondaTableView } from '@ronda/protocol';
import { Pill } from '@/components/ui/Pill';
import { formatEuros } from '@/lib/ronda';
import { RondaTableOverview } from '@/components/ronda/RondaTableOverview';

export function RondaMesaScreen({ view }: { view: RondaTableView }) {
  const result = view.roundResult;
  const standings = [...view.players].sort((a, b) => b.score - a.score);

  if (view.status === 'gameEnd') {
    const winners = standings.filter((player) => view.winnerIds.includes(player.playerId));
    return (
      <main className="flex min-h-dvh flex-1 flex-col items-center gap-8 px-10 py-10">
        <header className="text-center">
          <p className="eyebrow">Sobremesa terminada</p>
          <h1 className="mt-2 font-display text-[clamp(2.5rem,6vw,5rem)] text-hueso">{winners.length > 1 ? 'Victoria compartida' : `Gana ${winners[0]?.nick ?? 'la mesa'}`}</h1>
        </header>
        <ol className="flex w-full max-w-3xl flex-col gap-3">
          {standings.map((player, index) => (
            <li key={player.playerId} className="flex items-center gap-4 rounded-2xl border border-linea bg-mesa px-5 py-4">
              <span className="w-8 font-mono text-20 text-humo">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-24 text-hueso">{player.nick}</span>
              {view.winnerIds.includes(player.playerId) ? <Pill>Ganador</Pill> : null}
              <span className="font-mono text-24 text-oro">{formatEuros(player.score)}</span>
            </li>
          ))}
        </ol>
      </main>
    );
  }

  if (view.status === 'roundEnd') {
    return (
      <main className="flex min-h-dvh flex-1 flex-col items-center gap-8 px-10 py-10">
        <header className="text-center">
          <p className="eyebrow">Fin de la ronda {view.round}</p>
          <h1 className="mt-2 font-display text-[clamp(2.5rem,6vw,5rem)] text-hueso">La cuenta está pagada</h1>
          {result ? <p className="mt-3 font-mono text-32 text-oro">{formatEuros(result.totalCents)}</p> : null}
        </header>
        {result ? (
          <ul className="grid w-full max-w-4xl grid-cols-2 gap-3">
            {result.payments.map((payment) => {
              const player = view.players.find((candidate) => candidate.playerId === payment.playerId);
              return (
                <li key={payment.playerId} className="flex items-center gap-4 rounded-2xl border border-linea bg-mesa px-5 py-4">
                  <span className="min-w-0 flex-1 truncate text-22 text-hueso">{player?.nick ?? 'Jugador'}</span>
                  <span className="font-mono text-20 text-humo">−{formatEuros(payment.amountCents)}</span>
                  <span className="font-mono text-22 text-oro">{formatEuros(payment.balanceCents)}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
        <p className="mt-auto text-18 text-humo">La siguiente ronda se inicia desde los móviles.</p>
      </main>
    );
  }

  const turnNick = view.players.find((player) => player.playerId === view.turnPlayerId)?.nick;
  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center gap-5 px-10 py-8">
      <header className="flex w-full max-w-5xl items-end justify-between gap-6">
        <div>
          <p className="eyebrow">Ronda {view.round}</p>
          <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] text-hueso">La Ronda</h1>
        </div>
        <p className="text-right text-[clamp(1rem,2vw,1.5rem)] text-humo">{turnNick ? `Turno de ${turnNick}` : 'Resolviendo la cuenta'}</p>
      </header>
      <RondaTableOverview view={view} large />
      {view.publicCards.length > 0 ? <p className="text-16 text-humo">Última especial: <span className="text-hueso">{view.publicCards.at(-1)?.name}</span></p> : null}
    </main>
  );
}
