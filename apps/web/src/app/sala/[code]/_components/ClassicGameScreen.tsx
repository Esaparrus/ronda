'use client';

import { useEffect, useState } from 'react';
import { parseCardId, type CardId, type ClassicPlayerView, type PublicPlayer } from '@ronda/protocol';
import { CinquilloTable } from '@/components/cards/CinquilloTable';
import { MiniCardFan } from '@/components/cards/MiniCardFan';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { BarTable } from '@/components/ui/BarTable';
import { Button } from '@/components/ui/Button';
import { useRondaStore } from '@/lib/store';
import { PlayerStrip } from './PlayerStrip';
import { PochaHand } from './PochaHand';
import { PochaTrickArea } from './PochaTrickArea';
import { TableHeader } from './TableHeader';
import { escobaTableDensity } from './escoba-layout';

const TITLES: Record<ClassicPlayerView['gameId'], string> = {
  brisca: 'Brisca',
  escoba: 'Escoba',
  sieteymedia: 'Siete y media',
  tute: 'Tute',
  cinquillo: 'Cinquillo',
};

function escobaValue(cardId: CardId): number {
  const parsed = parseCardId(cardId);
  if (!parsed.ok) return 0;
  return parsed.value.rank <= 7 ? parsed.value.rank : parsed.value.rank - 2;
}

export function ClassicGameScreen({ view }: { view: ClassicPlayerView }) {
  const turn = view.players.find((player) => player.playerId === view.turnPlayerId) ?? null;
  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <TableHeader left={`${TITLES[view.gameId]} · Ronda ${view.round}`} turnNick={turn?.nick ?? null} />
      <PlayerStrip
        players={view.players}
        turnPlayerId={view.turnPlayerId}
        myPlayerId={view.me.playerId}
        renderInfo={
          view.gameId === 'sieteymedia'
            ? (player) => sevenHalfPlayerInfo(view, player)
            : undefined
        }
      />
      {view.gameId === 'escoba' ? (
        <EscobaBoard view={view} />
      ) : view.gameId === 'sieteymedia' ? (
        <SevenHalfBoard view={view} />
      ) : view.gameId === 'cinquillo' ? (
        <CinquilloBoard view={view} />
      ) : (
        <TrickBoard view={view} />
      )}
    </div>
  );
}

function TrickBoard({ view }: { view: ClassicPlayerView }) {
  const canPlay = view.me.availableActions.includes('playCard');
  return (
    <>
      <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-2">
        <div data-card-drop-target={canPlay ? 'pocha' : undefined} className="w-full max-w-[340px]">
          <BarTable>
            <PochaTrickArea
              trumpCardId={view.trumpCardId}
              currentTrick={view.currentTrick}
              players={view.players}
            />
            <p className="mt-2 text-center text-12 text-humo">
              Mazo: {view.deckCount} · Capturadas:{' '}
              {view.capturedCounts[view.players.findIndex((p) => p.playerId === view.me.playerId)] ?? 0}
            </p>
          </BarTable>
        </div>
      </div>
      <PochaHand
        hand={view.me.hand}
        legalCardIds={view.me.legalCardIds}
        canPlay={canPlay}
        onPlay={(cardId) => void useRondaStore.getState().sendAction({ type: 'playCard', cardId })}
      />
    </>
  );
}

function EscobaBoard({ view }: { view: ClassicPlayerView }) {
  const [handCard, setHandCard] = useState<CardId | null>(null);
  const [selectedTable, setSelectedTable] = useState<CardId[]>([]);
  const canPlay = view.me.availableActions.includes('playCapture');
  const tableDensity = escobaTableDensity(view.tableCards.length);

  useEffect(() => {
    setHandCard(null);
    setSelectedTable([]);
  }, [view.turnPlayerId, view.tableCards]);

  const total =
    (handCard ? escobaValue(handCard) : 0) +
    selectedTable.reduce((sum, cardId) => sum + escobaValue(cardId), 0);
  const validCapture = handCard !== null && selectedTable.length > 0 && total === 15;

  function toggleTable(cardId: CardId) {
    setSelectedTable((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
  }

  function play(capture: boolean) {
    if (!handCard) return;
    void useRondaStore.getState().sendAction({
      type: 'playCapture',
      cardId: handCard,
      captureIds: capture ? selectedTable : [],
    });
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-2">
        <BarTable className="w-full max-w-[340px]">
          <div className="escoba-table-layout">
            <div className="escoba-table-cards" data-density={tableDensity}>
              {view.tableCards.map((cardId) => (
                <button
                  key={cardId}
                  type="button"
                  disabled={!canPlay || !handCard}
                  onClick={() => toggleTable(cardId)}
                  aria-pressed={selectedTable.includes(cardId)}
                  className="escoba-table-card"
                >
                  <PlayingCard
                    cardId={cardId}
                    size="sm"
                    selected={selectedTable.includes(cardId)}
                  />
                </button>
              ))}
            </div>
            <div className="escoba-table-status">
              <p className="font-mono text-12 text-hueso" aria-live="polite">
                {handCard ? `Suma: ${total}` : 'Elige una carta de tu mano'}
              </p>
              <p className="whitespace-nowrap text-12 text-humo">Mazo · {view.deckCount}</p>
            </div>
          </div>
        </BarTable>
      </div>
      <SimpleHand hand={view.me.hand} selected={handCard} enabled={canPlay} onSelect={setHandCard} />
      <div className="grid shrink-0 grid-cols-2 gap-2 px-4 pb-4">
        <Button variant="ghost" disabled={!handCard} onClick={() => play(false)}>
          Dejar en mesa
        </Button>
        <Button disabled={!validCapture} onClick={() => play(true)}>
          Recoger 15
        </Button>
      </div>
    </>
  );
}

function SevenHalfBoard({ view }: { view: ClassicPlayerView }) {
  const canDraw = view.me.availableActions.includes('drawDeck');
  const canStand = view.me.availableActions.includes('stand');
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const banker = view.players.find((player) => player.playerId === view.bankerPlayerId);
  const denseTable = view.players.length > 4;
  return (
    <>
      <div className="seven-half-board">
        <div className="seven-half-board__meta" aria-label="Estado de la ronda">
          <div className="seven-half-board__meta-item">
            <span>Banca</span>
            <strong>{banker?.nick ?? '—'}</strong>
          </div>
          <div className="seven-half-board__meta-item">
            <span>Cartas en el mazo</span>
            <strong>{view.deckCount}</strong>
          </div>
        </div>
        <p className="seven-half-board__rule">
          Pide carta para acercarte a 7,5. Las figuras valen 0,5; si te pasas, pierdes la ronda.
        </p>
        <BarTable className="w-full max-w-[340px]">
          <ul className={`seven-half-table seven-half-table--compact ${denseTable ? 'seven-half-table--dense' : ''}`}>
            {view.players.map((player, index) => (
              <li
                key={player.playerId}
                className={`seven-half-table__player ${player.playerId === view.me.playerId ? 'seven-half-table__player--me' : ''}`}
              >
                <div className="seven-half-table__player-head">
                  <span className="seven-half-table__player-name">
                    {player.nick}
                    {player.playerId === view.bankerPlayerId ? ' · banca' : ''}
                  </span>
                  <span
                    className={`seven-half-table__player-status ${view.bustPlayerIds.includes(player.playerId) ? 'seven-half-table__player-status--bust' : ''}`}
                  >
                    {sevenHalfPlayerStatus(view, player.playerId, index)}
                  </span>
                </div>
                <MiniCardFan cards={view.revealedHands.find((hand) => hand.playerId === player.playerId)?.cards ?? []} />
              </li>
            ))}
          </ul>
        </BarTable>
      </div>
      <SevenHalfHand view={view} />
      <div className="seven-half-actions action-dock grid shrink-0 grid-cols-2 gap-2 px-4 pt-3">
        <Button
          variant="ghost"
          disabled={!canStand || pendingAction}
          loading={pendingAction}
          onClick={() => void useRondaStore.getState().sendAction({ type: 'stand' })}
        >
          Plantarse · {formatSevenHalfTotal(view.me.total)}
        </Button>
        <Button
          disabled={!canDraw || pendingAction}
          loading={pendingAction}
          onClick={() => void useRondaStore.getState().sendAction({ type: 'drawDeck' })}
        >
          Pedir carta
        </Button>
      </div>
    </>
  );
}

function formatSevenHalfTotal(total: number | null): string {
  return total === null ? '—' : String(total).replace('.', ',');
}

function sevenHalfPlayerInfo(view: ClassicPlayerView, player: PublicPlayer): string {
  const index = view.players.findIndex((candidate) => candidate.playerId === player.playerId);
  const total = player.playerId === view.me.playerId ? view.me.total : (view.totals[index] ?? null);
  if (view.bustPlayerIds.includes(player.playerId)) return 'se pasó';
  if (total !== null) return formatSevenHalfTotal(total);
  if (view.turnPlayerId === player.playerId) return 'en juego';
  return `${player.handCount} carta${player.handCount === 1 ? '' : 's'}`;
}

function sevenHalfPlayerStatus(view: ClassicPlayerView, playerId: string, index: number): string {
  const total = playerId === view.me.playerId ? view.me.total : (view.totals[index] ?? null);
  if (view.bustPlayerIds.includes(playerId)) return 'se pasó';
  if (total !== null) return formatSevenHalfTotal(total);
  if (view.turnPlayerId === playerId) return 'en juego';
  return 'oculto';
}

function SevenHalfHand({ view }: { view: ClassicPlayerView }) {
  const bust = view.bustPlayerIds.includes(view.me.playerId);
  const status = bust
    ? 'Te has pasado'
    : view.me.total === 7.5
      ? 'Siete y media'
      : `${formatSevenHalfTotal(view.me.total)} puntos`;

  return (
    <section className="game-hand seven-half-hand shrink-0 px-4 py-3">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="text-14 font-semibold text-hueso">Tu mano</h2>
        <span className={`font-mono text-12 ${bust ? 'text-brasa' : 'text-humo'}`}>{status}</span>
      </div>
      <div className="flex items-end gap-1 overflow-x-auto pb-2">
        {view.me.hand.map((cardId) => (
          <span key={cardId} className="shrink-0">
            <PlayingCard cardId={cardId} size="md" />
          </span>
        ))}
      </div>
    </section>
  );
}

function CinquilloBoard({ view }: { view: ClassicPlayerView }) {
  const canPlay = view.me.availableActions.includes('playCard');
  const canPass = view.me.availableActions.includes('pass');
  return (
    <>
      <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-2">
        <BarTable className="w-full max-w-[360px]">
          <CinquilloTable cards={view.tableCards} variant="compact" />
        </BarTable>
      </div>
      <div data-card-drop-target={canPlay ? 'pocha' : undefined}>
        <PochaHand
          hand={view.me.hand}
          legalCardIds={view.me.legalCardIds}
          canPlay={canPlay}
          onPlay={(cardId) => void useRondaStore.getState().sendAction({ type: 'playCard', cardId })}
        />
      </div>
      {canPass ? (
        <div className="shrink-0 px-4 pb-4">
          <Button variant="ghost" className="w-full" onClick={() => void useRondaStore.getState().sendAction({ type: 'pass' })}>
            Pasar
          </Button>
        </div>
      ) : null}
    </>
  );
}

function SimpleHand({
  hand,
  selected,
  enabled,
  onSelect,
}: {
  hand: CardId[];
  selected: CardId | null;
  enabled: boolean;
  onSelect: (cardId: CardId) => void;
}) {
  return (
    <section className="game-hand shrink-0 px-4 py-3">
      <h2 className="mb-2 text-14 font-semibold text-hueso">Tu mano</h2>
      <div className="flex items-end gap-1 overflow-x-auto pb-2">
        {hand.map((cardId) => (
          <button key={cardId} type="button" disabled={!enabled} onClick={() => onSelect(cardId)}>
            <PlayingCard cardId={cardId} size="md" selected={selected === cardId} />
          </button>
        ))}
      </div>
    </section>
  );
}
