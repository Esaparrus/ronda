// Lo que hay encima del tapete en Pocha: carta de triunfo (si la hay) y las
// cartas jugadas en la baza en curso. Análoga a CommonArea.tsx (Chinchón),
// sin mazo/descarte -- Pocha reparte la mano completa de la ronda de golpe,
// no se roba carta a carta.
//
// P32 la mete dentro de <BarTable>, así que las cartas bajan de tamaño: el
// triunfo de 'lg' a 'md' y las de la baza de 'md' a 'sm'. Con seis jugadores
// caben seis cartas en el tapete, y a 'md' no cabrían.
import type { CardId, PlayerId, PublicPlayer } from '@ronda/protocol';
import { TableTrick } from '@/components/cards/TableTrick';

export interface PochaTrickAreaProps {
  trumpCardId: CardId | null;
  currentTrick: { playerId: PlayerId; cardId: CardId }[];
  players: readonly PublicPlayer[];
}

export function PochaTrickArea({ trumpCardId, currentTrick, players }: PochaTrickAreaProps) {
  return (
    <TableTrick
      trumpCardId={trumpCardId}
      currentTrick={currentTrick}
      players={players}
      variant="compact"
    />
  );
}
