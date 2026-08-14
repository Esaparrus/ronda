import { SUITS, type ClassicTableView } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { Pill } from '@/components/ui/Pill';
import { SeatRing } from './SeatRing';

export function ClassicMesaGameBoard({ view }: { view: ClassicTableView }) {
  const centerCards = view.gameId === 'cinquillo' ? view.tableCards : view.currentTrick.map((card) => card.cardId);
  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <div className="relative aspect-square w-[min(92vw,84vh)]">
        <SeatRing players={view.players} turnPlayerId={view.turnPlayerId} />
        <div className="absolute inset-[18%] flex flex-col items-center justify-center gap-3 rounded-[20%] border border-linea bg-mesa/80 p-4">
          <div className="flex flex-wrap items-center justify-center gap-2">
            {view.gameId === 'escoba'
              ? view.tableCards.map((cardId) => <PlayingCard key={cardId} cardId={cardId} size="sm" />)
              : centerCards.map((cardId) => <PlayingCard key={cardId} cardId={cardId} size="sm" />)}
          </div>
          {view.gameId === 'sieteymedia' ? (
            <div className="flex flex-wrap justify-center gap-2">
              {view.players.map((player, index) => (
                <Pill key={player.playerId}>
                  {player.nick}: {view.bustPlayerIds.includes(player.playerId) ? 'se pasó' : view.totals[index] ?? 'oculto'}
                </Pill>
              ))}
            </div>
          ) : null}
          {view.trumpCardId ? (
            <div className="flex items-center gap-2">
              <PlayingCard cardId={view.trumpCardId} size="sm" />
              <Pill>Triunfo</Pill>
            </div>
          ) : null}
          {view.gameId === 'cinquillo' ? (
            <p className="text-12 text-humo">{SUITS.map((suit) => `${suit}: ${view.tableCards.filter((id) => id.startsWith(`${suit}-`)).length}`).join(' · ')}</p>
          ) : (
            <Pill>Mazo: {view.deckCount}</Pill>
          )}
        </div>
      </div>
    </main>
  );
}
