import type { CSSProperties } from 'react';
import type { CardId, PlayerId, PublicPlayer } from '@ronda/protocol';
import { PlayingCard } from './PlayingCard';
import { Pill } from '@/components/ui/Pill';

export interface TableTrickProps {
  currentTrick: readonly { playerId: PlayerId; cardId: CardId }[];
  players: readonly PublicPlayer[];
  trumpCardId?: CardId | null;
  deckCount?: number;
  variant?: 'compact' | 'large';
}

function cssPercentage(value: number): string {
  return `${Math.round(value * 1_000) / 1_000}%`;
}

/** Coloca cada baza hacia el asiento que la jugó, no en una fila arbitraria. */
export function TableTrick({
  currentTrick,
  players,
  trumpCardId = null,
  deckCount,
  variant = 'compact',
}: TableTrickProps) {
  const orderedPlayers = [...players].sort((a, b) => a.seat - b.seat);
  const playerCount = Math.max(orderedPlayers.length, 1);
  const crowded = playerCount >= 5;
  const horizontalRadius = crowded ? 36 : 30;
  const verticalRadius = crowded ? 31 : 25;

  return (
    <div
      className={`table-trick table-trick--${variant} ${crowded ? 'table-trick--crowded' : ''}`}
    >
      <div className="table-trick__center">
        {trumpCardId ? (
          <div className="table-trick__trump">
            <PlayingCard cardId={trumpCardId} size="sm" />
            <Pill className="table-trick__pill">Triunfo</Pill>
          </div>
        ) : currentTrick.length === 0 ? (
          <p className="text-center text-14 text-humo">Empieza la baza</p>
        ) : null}
        {deckCount !== undefined ? (
          <Pill className="table-trick__deck">Mazo: {deckCount}</Pill>
        ) : null}
      </div>

      {currentTrick.map((played) => {
        const playerIndex = Math.max(
          0,
          orderedPlayers.findIndex((player) => player.playerId === played.playerId),
        );
        const angle = (playerIndex / playerCount) * Math.PI * 2;
        const style = {
          '--trick-x': cssPercentage(50 + Math.sin(angle) * horizontalRadius),
          '--trick-y': cssPercentage(50 - Math.cos(angle) * verticalRadius),
        } as CSSProperties;
        const player = orderedPlayers[playerIndex];

        return (
          <div key={played.playerId} className="table-trick__played" style={style}>
            <PlayingCard cardId={played.cardId} size="sm" />
            <span className="table-trick__nick">{player?.nick ?? ''}</span>
          </div>
        );
      })}
    </div>
  );
}
