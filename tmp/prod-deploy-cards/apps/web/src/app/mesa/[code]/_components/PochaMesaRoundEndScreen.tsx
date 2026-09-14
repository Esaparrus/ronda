// Fin de ronda de Pocha en /mesa: misma información que /sala
// (PochaRoundEndScreen), en grande y con revelado escalonado (contrato
// P16 / §8.4). Vista siempre TableView: nunca lee `me`, sin botones.
import type { PochaTableView } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { pendingConfirmations } from '@/lib/pending';

export interface PochaMesaRoundEndScreenProps {
  view: PochaTableView;
}

const STAGGER_MS = 80;

export function PochaMesaRoundEndScreen({ view }: PochaMesaRoundEndScreenProps) {
  const result = view.roundResult;
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center gap-8 overflow-y-auto px-10 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-display text-hueso">
          Fin de ronda {view.round}
        </h1>
      </header>

      {result ? (
        <ul className="flex w-full max-w-3xl flex-col gap-4">
          {result.rows.map((row, i) => {
            const player = view.players.find((p) => p.playerId === row.playerId);
            return (
              <li
                key={row.playerId}
                className="flex items-center justify-between gap-3 rounded-lg border border-linea bg-mesa p-4"
                style={{
                  animation: `stagger-reveal 300ms ease-out both`,
                  animationDelay: `${i * STAGGER_MS}ms`,
                }}
              >
                <div className="flex items-center gap-3">
                  {player ? <Avatar name={player.nick} colorIndex={player.colorIndex} size={44} /> : null}
                  <span className="text-[clamp(1.1rem,2vw,1.5rem)] text-hueso">
                    {player?.nick ?? row.playerId}
                  </span>
                  <span className="font-mono text-[clamp(0.9rem,1.4vw,1.15rem)] text-humo">
                    cantó {row.bid}, ganó {row.tricksWon}
                  </span>
                </div>
                <span className="font-mono text-[clamp(1.25rem,2.2vw,1.75rem)] text-hueso">
                  {row.delta >= 0 ? '+' : ''}
                  {row.delta} · {row.total}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className="mt-auto text-[clamp(0.9rem,1.5vw,1.15rem)] text-humo">
        {waitingFor.length > 0
          ? `Esperando a confirmar: ${waitingFor.map((p) => p.nick).join(', ')}.`
          : 'Todos han confirmado. Empezando la siguiente ronda.'}
      </p>
    </main>
  );
}
