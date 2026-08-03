// Fila de estado por asiento: cante de cada jugador (o "?" si no ha cantado
// todavía) y bazas ganadas en la ronda en curso. `view.bids`/`view.tricksWon`
// ya vienen indexados por asiento (contrato §2.5, PochaCommonView) -- nada
// que recalcular aquí.
import type { PublicPlayer } from '@ronda/protocol';

export interface PochaBidRowProps {
  players: readonly PublicPlayer[];
  bids: readonly (number | null)[];
  tricksWon: readonly number[];
}

export function PochaBidRow({ players, bids, tricksWon }: PochaBidRowProps) {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  return (
    <div className="flex gap-1 border-b border-linea px-2 py-2">
      {ordered.map((p) => (
        <div key={p.playerId} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
          <span className="max-w-full truncate text-12 text-humo">{p.nick}</span>
          <span className="font-mono text-14 text-hueso">
            {bids[p.seat] ?? '?'} · {tricksWon[p.seat] ?? 0}
          </span>
        </div>
      ))}
    </div>
  );
}
