// Composición de la "Partida" en /mesa: anillo de asientos alrededor de un
// centro con mazo y descarte. Contrato P15. Vista siempre TableView: nunca
// lee `me`.
import type { ChinchonTableView } from '@ronda/protocol';
import { SeatRing } from './SeatRing';
import { CenterTable } from './CenterTable';

// Vocabulario de Chinchón (mazo/descarte): el dispatcher (MesaClient.tsx) ya
// estrecha `TableView` antes de llegar aquí.
export interface MesaGameBoardProps {
  view: ChinchonTableView;
}

export function MesaGameBoard({ view }: MesaGameBoardProps) {
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <div className="relative aspect-square w-[min(90vw,80vh)]">
        <SeatRing players={view.players} turnPlayerId={view.turnPlayerId} />
        <div className="absolute inset-0 flex items-center justify-center">
          <CenterTable
            deckCount={view.deckCount}
            discardTop={view.discardTop}
            discardCount={view.discardCount}
          />
        </div>
      </div>
    </main>
  );
}
