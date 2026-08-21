// Composición de la "Partida" en /mesa para Pocha. Mismo envoltorio que
// MesaGameBoard.tsx (Chinchón): SeatRing + centro. Vista siempre TableView:
// nunca lee `me`. Usa `renderBadge` de SeatRing para mostrar cante/bazas
// bajo cada asiento, en vez de duplicar la geometría del anillo (ya
// genérica de verdad, sin límite de 4 jugadores).
import type { PochaTableView } from '@ronda/protocol';
import { SeatRing } from './SeatRing';
import { PochaCenterTable } from './PochaCenterTable';

export interface PochaMesaGameBoardProps {
  view: PochaTableView;
}

export function PochaMesaGameBoard({ view }: PochaMesaGameBoardProps) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <div className="mesa-arena relative aspect-square w-[min(90vw,80vh)]">
        <SeatRing
          players={view.players}
          turnPlayerId={view.turnPlayerId}
          renderBadge={(p) => (
            <span className="font-mono text-[clamp(0.9rem,1.4vw,1.25rem)] text-humo">
              {view.bids[p.seat] ?? '?'} · {view.tricksWon[p.seat] ?? 0}
            </span>
          )}
        />
        <div className="absolute inset-[16%] flex items-center justify-center">
          <PochaCenterTable
            trumpCardId={view.trumpCardId}
            currentTrick={view.currentTrick}
            players={view.players}
          />
        </div>
      </div>
    </main>
  );
}
