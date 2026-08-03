// Zona común de Pocha: carta de triunfo (si la hay) y las cartas jugadas en
// la baza en curso. Análoga a CommonArea.tsx (Chinchón), sin mazo/descarte
// -- Pocha reparte la mano completa de la ronda de golpe, no se roba carta
// a carta.
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
    <div className="flex flex-1 flex-wrap items-center justify-center gap-6 py-4">
      {trumpCardId ? (
        <div className="flex flex-col items-center gap-2">
          <PlayingCard cardId={trumpCardId} size="lg" />
          <Pill>Triunfo</Pill>
        </div>
      ) : null}

      {currentTrick.length > 0 ? (
        <div className="flex flex-wrap items-end justify-center gap-3">
          {currentTrick.map((t) => (
            <div key={t.playerId} className="flex flex-col items-center gap-1">
              <PlayingCard cardId={t.cardId} size="md" />
              <span className="text-12 text-humo">{nickFor(t.playerId)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-14 text-humo">Empieza la baza.</p>
      )}
    </div>
  );
}
