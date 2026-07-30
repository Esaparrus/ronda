// Fin de partida en /mesa: placeholder DELIBERADAMENTE MÍNIMO, mismo
// motivo que MesaRoundEndScreen -- la clasificación final en grande y el
// recuento de votos de revancha son P16. Vista siempre TableView: nunca
// lee `me`.
import type { TableView } from '@ronda/protocol';

export interface MesaGameEndScreenProps {
  view: TableView;
}

export function MesaGameEndScreen({ view }: MesaGameEndScreenProps) {
  const winner = view.players.find((p) => p.playerId === view.winnerId);

  return (
    <main className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 px-10 text-center">
      <h1 className="font-display text-[clamp(2.25rem,5vw,4rem)] leading-display text-hueso">
        Partida terminada
      </h1>
      {winner ? (
        <p className="text-[clamp(1.5rem,3vw,2.25rem)] text-hueso">Gana {winner.nick}</p>
      ) : null}
    </main>
  );
}
