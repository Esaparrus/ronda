// Fin de ronda: placeholder DELIBERADAMENTE MÍNIMO. El contrato reparte el
// trabajo entre paquetes -- P16 es "fin de ronda, fin de partida y
// revancha", con su propia revelación escalonada y demás pulido -- así que
// esta pantalla de P14 solo tiene que dejar una partida completa jugable de
// principio a fin (criterio de aceptación: "partida entera de 4 jugadores").
// No implementa la revelación animada de combinaciones ni nada del estilo:
// eso se deja explícitamente para P16.
'use client';

import type { PlayerView } from '@ronda/protocol';
import { Button } from '@/components/ui/Button';
import { useRondaStore } from '@/lib/store';

export interface RoundEndScreenProps {
  view: PlayerView;
}

export function RoundEndScreen({ view }: RoundEndScreenProps) {
  const result = view.roundResult;

  function handleNextRound() {
    void useRondaStore.getState().sendAction({ type: 'nextRound' });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-6 py-8">
      <h1 className="font-display text-24 leading-display text-hueso">Fin de ronda</h1>

      {result ? (
        <ul className="flex flex-col gap-2">
          {result.rows.map((row) => {
            const player = view.players.find((p) => p.playerId === row.playerId);
            return (
              <li
                key={row.playerId}
                className="flex items-center justify-between rounded-lg border border-linea bg-mesa px-3 py-2"
              >
                <span className="text-16 text-hueso">{player?.nick ?? row.playerId}</span>
                <span className="font-mono text-14 text-humo">
                  {row.delta >= 0 ? '+' : ''}
                  {row.delta} · {row.total}
                  {row.eliminated ? ' · eliminado' : ''}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <Button onClick={handleNextRound} className="mt-auto">
        Siguiente ronda
      </Button>
    </main>
  );
}
