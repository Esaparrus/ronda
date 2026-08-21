import type { CardId, ClassicTableView, PlayerId } from '@ronda/protocol';
import { AdaptiveCardGrid } from '@/components/cards/AdaptiveCardGrid';
import { CinquilloTable } from '@/components/cards/CinquilloTable';
import { MiniCardFan } from '@/components/cards/MiniCardFan';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { TableTrick } from '@/components/cards/TableTrick';
import { Pill } from '@/components/ui/Pill';
import { SeatRing } from './SeatRing';

const TITLE = {
  brisca: 'Brisca',
  escoba: 'Escoba',
  sieteymedia: 'Siete y media',
  tute: 'Tute',
  cinquillo: 'Cinquillo',
} as const;

export function ClassicMesaGameBoard({ view }: { view: ClassicTableView }) {
  const publicCardCount =
    view.gameId === 'sieteymedia'
      ? view.revealedHands.reduce((count, hand) => count + hand.cards.length, 0)
      : view.tableCards.length || view.currentTrick.length;

  return (
    <main className="flex min-h-dvh flex-1 items-center justify-center p-6">
      <div className="mesa-arena relative aspect-square w-[min(92vw,84vh)]">
        <SeatRing
          players={view.players}
          turnPlayerId={view.turnPlayerId}
          renderBadge={
            view.gameId === 'sieteymedia'
              ? (player) => {
                  const index = view.players.findIndex(
                    (candidate) => candidate.playerId === player.playerId,
                  );
                  const total = view.totals[index];
                  return total !== null ? (
                    <span className="font-mono text-[clamp(0.8rem,1.2vw,1rem)] text-oro">
                      {view.bustPlayerIds.includes(player.playerId) ? 'Se pasó' : total}
                    </span>
                  ) : null;
                }
              : undefined
          }
        />

        <section className="mesa-table-content absolute inset-[15%] flex flex-col items-center justify-center gap-2 rounded-[18%] p-[clamp(0.6rem,1.5vw,1rem)]">
          <div className="absolute left-1/2 top-2 z-20 -translate-x-1/2">
            <Pill className="whitespace-nowrap text-[clamp(0.7rem,1vw,0.9rem)]">
              {TITLE[view.gameId]} · {publicCardCount} en mesa
            </Pill>
          </div>
          {view.gameId === 'brisca' || view.gameId === 'tute' ? (
            <TableTrick
              currentTrick={view.currentTrick}
              players={view.players}
              trumpCardId={view.trumpCardId}
              deckCount={view.deckCount}
              variant="large"
            />
          ) : null}
          {view.gameId === 'escoba' ? <EscobaTable view={view} /> : null}
          {view.gameId === 'sieteymedia' ? <SevenHalfTable view={view} /> : null}
          {view.gameId === 'cinquillo' ? (
            <CinquilloTable cards={view.tableCards} variant="large" />
          ) : null}
        </section>
      </div>
    </main>
  );
}

function EscobaTable({ view }: { view: ClassicTableView }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 pt-6">
      <AdaptiveCardGrid cardCount={view.tableCards.length} variant="large">
        {view.tableCards.map((cardId) => (
          <PlayingCard key={cardId} cardId={cardId} size="sm" />
        ))}
      </AdaptiveCardGrid>
      <Pill className="shrink-0">Mazo: {view.deckCount}</Pill>
    </div>
  );
}

function SevenHalfTable({ view }: { view: ClassicTableView }) {
  const hands = new Map<PlayerId, CardId[]>(
    view.revealedHands.map((hand) => [hand.playerId, hand.cards]),
  );

  return (
    <div className="seven-half-table seven-half-table--large pt-6">
      {view.players.map((player, index) => {
        const cards = hands.get(player.playerId) ?? [];
        const total = view.totals[index];
        return (
          <section key={player.playerId} className="seven-half-table__player">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-14 font-semibold text-hueso">{player.nick}</span>
              <span className="shrink-0 font-mono text-13 text-oro">
                {view.bustPlayerIds.includes(player.playerId)
                  ? 'Se pasó'
                  : total ?? (player.playerId === view.bankerPlayerId ? 'Banca' : 'Oculto')}
              </span>
            </div>
            <MiniCardFan cards={cards} />
          </section>
        );
      })}
    </div>
  );
}
