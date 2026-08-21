import type { ClassicTableView, PlayerId } from '@ronda/protocol';
import { MiniCardFan } from '@/components/cards/MiniCardFan';
import { Pill } from '@/components/ui/Pill';

function formatTotal(total: number | null): string {
  return total === null ? '—' : String(total).replace('.', ',');
}

function resultLabel(view: ClassicTableView, playerId: PlayerId, total: number | null): string {
  if (view.bustPlayerIds.includes(playerId)) return 'Se pasó';
  if (total === 7.5) return 'Siete y media';
  return `Plantado · ${formatTotal(total)}`;
}

export function ClassicMesaRoundEndScreen({ view }: { view: ClassicTableView }) {
  const banker = view.players.find((player) => player.playerId === view.bankerPlayerId);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center gap-6 px-8 py-10">
      <header className="text-center">
        <p className="eyebrow">Siete y media · Fin de la ronda {view.round}</p>
        <h1 className="mt-2 font-display text-[clamp(2.5rem,6vw,5rem)] text-hueso">
          Resultado de la mesa
        </h1>
        <p className="mt-2 text-18 text-humo">Banca: {banker?.nick ?? '—'}</p>
      </header>

      <ul className="grid w-full max-w-5xl grid-cols-2 gap-4">
        {view.players.map((player, index) => {
          const cards = view.revealedHands.find((hand) => hand.playerId === player.playerId)?.cards ?? [];
          const total = view.totals[index] ?? null;
          return (
            <li key={player.playerId} className="seven-half-round-end__player seven-half-round-end__player--large">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 truncate text-20 font-semibold text-hueso">{player.nick}</span>
                {player.playerId === view.bankerPlayerId ? <Pill>Banca</Pill> : null}
              </div>
              <div className="seven-half-round-end__cards">
                <MiniCardFan cards={cards} />
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="font-mono text-16 text-oro">{resultLabel(view, player.playerId, total)}</span>
                  <span className="font-mono text-14 text-humo">Puntos: {player.score}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-auto text-18 text-humo">La siguiente ronda se inicia desde los móviles.</p>
    </main>
  );
}
