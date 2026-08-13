// Fin de ronda. Contrato P16: tabla con combinaciones reveladas (cartas
// reales, agrupadas), cartas sueltas con sus puntos, puntos de la ronda y
// total -- todo tal cual llega en `roundResult`, sin recalcular nada aquí.
// Quien cerró va marcado; el cierre en seco se resalta con su delta real
// (config.dryCloseBonus es configurable a 0 o -10: se muestra el número que
// mandó el servidor, nunca un -10 fijo). Eliminación: fila marcada con un
// Pill sobrio, sin cartel de celebración para nadie.
'use client';

import { useState } from 'react';
import type { ChinchonPlayerView, PlayerId } from '@ronda/protocol';
import { messageFor } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { RevealedHand } from '@/components/cards/RevealedHand';
import { useRondaStore } from '@/lib/store';
import { pendingConfirmations } from '@/lib/pending';

// Vocabulario de Chinchón (melds/leftovers, jokerPoints, chinchonBy...): el
// dispatcher (SalaClient.tsx) ya estrecha `PlayerView` antes de llegar aquí.
export interface RoundEndScreenProps {
  view: ChinchonPlayerView;
}

function nickFor(view: ChinchonPlayerView, playerId: PlayerId | null): string | null {
  if (!playerId) return null;
  return view.players.find((p) => p.playerId === playerId)?.nick ?? null;
}

export function RoundEndScreen({ view }: RoundEndScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const result = view.roundResult;

  const me = view.players.find((p) => p.playerId === view.me.playerId);
  const iAmEliminated = me?.eliminated ?? false;
  const iConfirmed = view.rematchVotes.includes(view.me.playerId);
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);
  const chinchonNick = nickFor(view, result?.chinchonBy ?? null);

  async function handleNextRound() {
    setConfirming(true);
    await useRondaStore.getState().sendAction({ type: 'nextRound' });
    setConfirming(false);
  }

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="font-display text-28 leading-display text-hueso">
          Fin de ronda {view.round}
        </h1>
        {chinchonNick ? <p className="text-16 text-hueso">Chinchón de {chinchonNick}.</p> : null}
      </header>

      {result ? (
        <ul className="flex flex-col gap-3">
          {result.rows.map((row) => {
            const player = view.players.find((p) => p.playerId === row.playerId);
            const isCloser = result.closedBy === row.playerId;
            const isDryClose = isCloser && row.leftovers.length === 0;
            return (
              <li
                key={row.playerId}
                className="surface-panel flex flex-col gap-3 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {player ? (
                      <Avatar name={player.nick} colorIndex={player.colorIndex} size={32} />
                    ) : null}
                    <span className="text-16 font-semibold text-hueso">
                      {player?.nick ?? row.playerId}
                    </span>
                    {isCloser ? <Pill>Cerró</Pill> : null}
                    {isDryClose ? (
                      <Pill>
                        Cierre en seco {row.delta >= 0 ? '+' : ''}
                        {row.delta}
                      </Pill>
                    ) : null}
                    {row.eliminated ? <Pill>Eliminado</Pill> : null}
                  </div>
                  <span className="font-mono text-16 text-hueso">
                    {row.delta >= 0 ? '+' : ''}
                    {row.delta} · {row.total}
                  </span>
                </div>
                <RevealedHand
                  melds={row.melds}
                  leftovers={row.leftovers}
                />
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-auto flex flex-col gap-2">
        {iAmEliminated ? (
          <p className="text-center text-14 text-humo">{messageFor('PLAYER_ELIMINATED')}</p>
        ) : iConfirmed ? (
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
