// Fin de partida: placeholder DELIBERADAMENTE MÍNIMO, mismo motivo que
// RoundEndScreen -- el pulido (revancha con votos, etc.) es de P16. Aquí
// solo se anuncia quién ha ganado, sin UI de revancha (`rematchVotes` ya
// llega en la vista pero esta pantalla no la usa todavía).
'use client';

import type { PlayerView } from '@ronda/protocol';

export interface GameEndScreenProps {
  view: PlayerView;
}

export function GameEndScreen({ view }: GameEndScreenProps) {
  const winner = view.players.find((p) => p.playerId === view.winnerId);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-28 leading-display text-hueso">Partida terminada</h1>
      {winner ? <p className="text-18 text-hueso">Gana {winner.nick}</p> : null}
    </main>
  );
}
