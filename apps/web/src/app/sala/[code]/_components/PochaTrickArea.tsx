// Lo que hay encima del tapete en Pocha: carta de triunfo (si la hay) y las
// cartas jugadas en la baza en curso. Análoga a CommonArea.tsx (Chinchón),
// sin mazo/descarte -- Pocha reparte la mano completa de la ronda de golpe,
// no se roba carta a carta.
//
// P32 la mete dentro de <BarTable>, así que las cartas bajan de tamaño: el
// triunfo de 'lg' a 'md' y las de la baza de 'md' a 'sm'. Con seis jugadores
// caben seis cartas en el tapete, y a 'md' no cabrían.
import type { CardId, PlayerId, PublicPlayer } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { Pill } from '@/components/ui/Pill';

export interface PochaTrickAreaProps {
  trumpCardId: CardId | null;
  currentTrick: { playerId: PlayerId; cardId: CardId }[];
  players: readonly PublicPlayer[];
}

export function PochaTrickArea({ trumpCardId, currentTrick, players }: PochaTrickAreaProps) {
  function nickFor(playerId: PlayerId): string {
    return players.find((p) => p.playerId === playerId)?.nick ?? '';
  }

  return (
    <>
      {trumpCardId ? (
        <div className="flex flex-col items-center gap-[6px]">
          <PlayingCard cardId={trumpCardId} size="md" />
          <Pill className="border-oro bg-tinta text-hueso">Triunfo</Pill>
        </div>
      ) : null}

      {currentTrick.length > 0 ? (
        <div className="flex max-w-[190px] flex-wrap items-end justify-center gap-2">
          {currentTrick.map((t) => (
            <div key={t.playerId} className="flex flex-col items-center gap-1">
              <PlayingCard cardId={t.cardId} size="sm" />
              <span className="max-w-[52px] truncate text-12 text-hueso">
                {nickFor(t.playerId)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-14 text-hueso">Empieza la baza.</p>
      )}
    </>
  );
}
