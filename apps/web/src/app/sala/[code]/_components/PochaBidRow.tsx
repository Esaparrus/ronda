// Fila de estado por asiento: cante de cada jugador (o "?" si no ha cantado
// todavía) y bazas ganadas en la ronda en curso. `view.bids`/`view.tricksWon`
// ya vienen indexados por asiento (contrato §2.5, PochaCommonView) -- nada
// que recalcular aquí.
//
// P32 añade los garbanzos (§8.6). En Pocha el garbanzo es una BAZA GANADA y
// los huecos son las que cantaste: la fila llena significa que has clavado el
// cante. Si te pasas del cante, la fila crece por encima de los huecos que
// pediste, y esos garbanzos de más son exactamente los que te hunden la
// ronda -- que es la información que un jugador de Pocha mira todo el rato.
import type { PublicPlayer } from '@ronda/protocol';
import { Garbanzos } from '@/components/ui/Garbanzos';

export interface PochaBidRowProps {
  players: readonly PublicPlayer[];
  bids: readonly (number | null)[];
  tricksWon: readonly number[];
}

export function PochaBidRow({ players, bids, tricksWon }: PochaBidRowProps) {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  return (
    <div className="flex gap-1 border-b border-linea px-2 py-2">
      {ordered.map((p) => {
        const bid = bids[p.seat] ?? null;
        const won = tricksWon[p.seat] ?? 0;
        return (
          <div key={p.playerId} className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
            <span className="max-w-full truncate text-12 text-humo">{p.nick}</span>
            <span className="font-mono text-14 text-hueso">
              {bid ?? '?'} · {won}
            </span>
            {bid !== null ? (
              <Garbanzos
                count={won}
                total={Math.max(bid, won)}
                label={`Bazas de ${p.nick}`}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
