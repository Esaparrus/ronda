'use client';

import { useState } from 'react';
import type { ClassicPlayerView, PlayerId } from '@ronda/protocol';
import { MiniCardFan } from '@/components/cards/MiniCardFan';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { pendingConfirmations } from '@/lib/pending';
import { useRondaStore } from '@/lib/store';

function formatTotal(total: number | null): string {
  return total === null ? '—' : String(total).replace('.', ',');
}

function resultLabel(view: ClassicPlayerView, playerId: PlayerId, total: number | null): string {
  if (view.bustPlayerIds.includes(playerId)) return 'Se pasó';
  if (total === 7.5) return 'Siete y media';
  return `Plantado · ${formatTotal(total)}`;
}

export function ClassicRoundEndScreen({ view }: { view: ClassicPlayerView }) {
  const [confirming, setConfirming] = useState(false);
  const banker = view.players.find((player) => player.playerId === view.bankerPlayerId);
  const iConfirmed = view.rematchVotes.includes(view.me.playerId);
  const waitingFor = pendingConfirmations(view.players, view.rematchVotes);

  async function handleNextRound() {
    setConfirming(true);
    await useRondaStore.getState().sendAction({ type: 'nextRound' });
    setConfirming(false);
  }

  return (
    <main className="classic-round-end app-page safe-page mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-5 px-4">
      <header className="flex flex-col items-center gap-2 text-center">
        <p className="font-mono text-12 uppercase tracking-wider text-oro">Siete y media</p>
        <h1 className="font-display text-28 leading-display text-hueso">Fin de ronda {view.round}</h1>
        <p className="max-w-sm text-14 text-humo">
          La banca era {banker?.nick ?? '—'}. Ya se han revelado todas las manos.
        </p>
      </header>

      <p className="seven-half-round-end__rule">
        Más de 7,5 es pasarse · 7,5 exactos es la mejor jugada · las figuras valen 0,5.
      </p>

      <ul className="seven-half-round-end__list">
        {view.players.map((player, index) => {
          const total = view.totals[index] ?? null;
          const cards = view.revealedHands.find((hand) => hand.playerId === player.playerId)?.cards ?? [];
          const isMe = player.playerId === view.me.playerId;
          return (
            <li
              key={player.playerId}
              className={`seven-half-round-end__player ${isMe ? 'seven-half-round-end__player--me' : ''}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={player.nick} colorIndex={player.colorIndex} size={32} />
                <span className="min-w-0 flex-1 truncate text-15 font-semibold text-hueso">
                  {player.nick}
                </span>
                {player.playerId === view.bankerPlayerId ? <Pill>Banca</Pill> : null}
              </div>
              <div className="seven-half-round-end__cards">
                <MiniCardFan cards={cards} />
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <span
                    className={`font-mono text-12 ${view.bustPlayerIds.includes(player.playerId) ? 'text-brasa' : 'text-oro'}`}
                  >
                    {resultLabel(view, player.playerId, total)}
                  </span>
                  <span className="font-mono text-11 text-humo">Puntos: {player.score}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-2 pb-4">
        {iConfirmed ? (
          <p className="text-center text-14 text-humo">
            Ronda confirmada.{' '}
            {waitingFor.length > 0
              ? `Esperando a ${waitingFor.map((player) => player.nick).join(', ')}.`
              : 'Preparando la siguiente ronda.'}
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
