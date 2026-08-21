// Centro del anillo para Pocha: triunfo + baza colocada hacia el asiento de
// quien jugó cada carta. Vista siempre TableView: nunca lee `me`.
import type { CardId, PlayerId, PublicPlayer } from '@ronda/protocol';
import { TableTrick } from '@/components/cards/TableTrick';

export interface PochaCenterTableProps {
  trumpCardId: CardId | null;
  currentTrick: { playerId: PlayerId; cardId: CardId }[];
  players: PublicPlayer[];
}

export function PochaCenterTable({ trumpCardId, currentTrick, players }: PochaCenterTableProps) {
  return (
    <div className="mesa-table-content h-full w-full rounded-[20%] p-2">
      <TableTrick
        trumpCardId={trumpCardId}
        currentTrick={currentTrick}
        players={players}
        variant="large"
      />
    </div>
  );
}
