// Fin de ronda en /mesa: misma información que /sala (RoundEndScreen), en
// grande y con revelado escalonado (contrato P16 / §8.4: 80ms por fila).
// Vista siempre TableView: nunca lee `me`, ni permite ninguna acción --
// solo información, «quién falta por confirmar» incluido (no hay botón,
// eso vive en /sala).
import type { ChinchonTableView, PlayerId } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { RevealedHand } from '@/components/cards/RevealedHand';
import { pendingConfirmations } from '@/lib/pending';

// Vocabulario de Chinchón (melds/leftovers, jokerPoints, chinchonBy...): el
// dispatcher (MesaClient.tsx) ya estrecha `TableView` antes de llegar aquí.
export interface MesaRoundEndScreenProps {
  view: ChinchonTableView;
}

const STAGGER_MS = 80;

function nickFor(view: ChinchonTableView, playerId: PlayerId | null): string | null {
  if (!playerId) return null;
  return view.players.find((p) => p.playerId === playerId)?.nick ?? null;
}

export function MesaRoundEndScreen({ view }: MesaRoundEndScreenProps) {
  const result = view.roundResult;
  const chinchonNick = nickFor(view, result?.chinchonBy ?? null);
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center gap-8 overflow-y-auto px-10 py-10">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-display text-hueso">
          Fin de ronda {view.round}
        </h1>
        {chinchonNick ? (
          <p className="text-[clamp(1.1rem,2vw,1.5rem)] text-hueso">Chinchón de {chinchonNick}.</p>
        ) : null}
      </header>

      {result ? (
        <ul className="flex w-full max-w-4xl flex-col gap-4">
          {result.rows.map((row, i) => {
            const player = view.players.find((p) => p.playerId === row.playerId);
            const isCloser = result.closedBy === row.playerId;
            const isDryClose = isCloser && row.leftovers.length === 0;
            return (
              <li
                key={row.playerId}
                className="flex flex-col gap-3 rounded-lg border border-linea bg-mesa p-4"
                style={{
                  animation: `stagger-reveal 300ms ease-out both`,
                  animationDelay: `${i * STAGGER_MS}ms`,
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {player ? (
                      <Avatar name={player.nick} colorIndex={player.colorIndex} size={44} />
                    ) : null}
                    <span className="text-[clamp(1.1rem,2vw,1.5rem)] text-hueso">
                      {player?.nick ?? row.playerId}
                    </span>
                    {isCloser ? (
                      <Pill className="text-[clamp(0.8rem,1.2vw,1rem)]">Cerró</Pill>
                    ) : null}
                    {isDryClose ? (
                      <Pill className="text-[clamp(0.8rem,1.2vw,1rem)]">
                        Cierre en seco {row.delta >= 0 ? '+' : ''}
                        {row.delta}
                      </Pill>
                    ) : null}
                    {row.eliminated ? (
                      <Pill className="text-[clamp(0.8rem,1.2vw,1rem)]">Eliminado</Pill>
                    ) : null}
                  </div>
                  <span className="font-mono text-[clamp(1.25rem,2.2vw,1.75rem)] text-hueso">
                    {row.delta >= 0 ? '+' : ''}
                    {row.delta} · {row.total}
                  </span>
                </div>
                <div className="[&_svg]:h-auto [&_svg]:w-[clamp(48px,5vw,84px)]">
                  <RevealedHand
                    melds={row.melds}
                    leftovers={row.leftovers}
                  />
                </div>
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
