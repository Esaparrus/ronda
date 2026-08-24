'use client';

import { useEffect, useState } from 'react';
import { parseCardId, type CardId, type ClassicPlayerView, type GameAction, type PublicPlayer } from '@ronda/protocol';
import { CinquilloTable } from '@/components/cards/CinquilloTable';
import { CardBack } from '@/components/cards/CardBack';
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

type GameActionSender = (action: GameAction) => void;

function sendGameAction(action: GameAction): void {
  void useRondaStore.getState().sendAction(action);
}

function escobaValue(cardId: CardId): number {
  const parsed = parseCardId(cardId);
  if (!parsed.ok) return 0;
  return parsed.value.rank <= 7 ? parsed.value.rank : parsed.value.rank - 2;
}

export function ClassicGameScreen({
  view,
  onAction,
}: {
  view: ClassicPlayerView;
  onAction?: GameActionSender;
}) {
  const dispatch = onAction ?? sendGameAction;
  const turn = view.players.find((player) => player.playerId === view.turnPlayerId) ?? null;
  const isSevenHalf = view.gameId === 'sieteymedia';
  const meIsBust = isSevenHalf && view.bustPlayerIds.includes(view.me.playerId);
  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <TableHeader
        left={`${TITLES[view.gameId]} · Ronda ${view.round}`}
        turnNick={meIsBust ? null : (turn?.nick ?? null)}
        statusLabel={meIsBust ? 'Te has pasado' : null}
        statusTone={meIsBust ? 'critical' : 'calm'}
      />
      <PlayerStrip
        players={view.players}
        turnPlayerId={view.turnPlayerId}
        myPlayerId={view.me.playerId}
        alertPlayerIds={isSevenHalf ? view.bustPlayerIds : undefined}
        className={view.gameId === 'escoba' ? 'classic-player-strip--escoba' : undefined}
        renderInfo={
          isSevenHalf
            ? (player) => sevenHalfPlayerInfo(view, player)
            : undefined
        }
      />
      {view.gameId === 'escoba' ? (
        <EscobaBoard view={view} onAction={dispatch} />
      ) : view.gameId === 'sieteymedia' ? (
        <SevenHalfBoard view={view} onAction={dispatch} />
      ) : view.gameId === 'cinquillo' ? (
        <CinquilloBoard view={view} onAction={dispatch} />
      ) : (
        <TrickBoard view={view} onAction={dispatch} />
      )}
    </div>
  );
}

function TrickBoard({ view, onAction }: { view: ClassicPlayerView; onAction: GameActionSender }) {
  const canPlay = view.me.availableActions.includes('playCard');
  return (
    <>
      <div className="classic-table-stage flex min-h-0 flex-1 items-center justify-center">
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
            onPlay={(cardId) => onAction({ type: 'playCard', cardId })}
      />
    </>
  );
}

function EscobaBoard({ view, onAction }: { view: ClassicPlayerView; onAction: GameActionSender }) {
  const [handCard, setHandCard] = useState<CardId | null>(null);
  const [selectedTable, setSelectedTable] = useState<CardId[]>([]);
  const canPlay = view.me.availableActions.includes('playCapture');
  const tableDensity = escobaTableDensity(view.tableCards.length);

  useEffect(() => {
    setHandCard(null);
    setSelectedTable([]);
  }, [view.turnPlayerId, view.tableCards]);

  useEffect(() => {
    // Si se quita la carta de la mano, las cartas de la mesa dejan de formar
    // una jugada pendiente y no deben conservar el estado visual de selección.
    if (handCard === null) {
      setSelectedTable((current) => (current.length > 0 ? [] : current));
    }
  }, [handCard]);

  const total =
    (handCard ? escobaValue(handCard) : 0) +
    selectedTable.reduce((sum, cardId) => sum + escobaValue(cardId), 0);
  const validCapture = handCard !== null && selectedTable.length > 0 && total === 15;

  function toggleTable(cardId: CardId) {
    setSelectedTable((current) =>
      current.includes(cardId) ? current.filter((id) => id !== cardId) : [...current, cardId],
    );
  }

  function toggleHandCard(cardId: CardId) {
    setHandCard((current) => (current === cardId ? null : cardId));
  }

  function play(capture: boolean) {
    if (!handCard) return;
    onAction({
      type: 'playCapture',
      cardId: handCard,
      captureIds: capture ? selectedTable : [],
    });
  }

  return (
    <>
      <div className="classic-table-stage classic-table-stage--escoba flex min-h-0 flex-1 items-center justify-center">
        <BarTable className="escoba-table-frame w-full max-w-[320px]">
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
              <p className="escoba-table-status__message font-mono text-12" aria-live="polite">
                {handCard ? `Suma: ${total}` : 'Elige una carta de tu mano'}
              </p>
              <p className="escoba-table-status__deck whitespace-nowrap text-12">Mazo · {view.deckCount}</p>
            </div>
          </div>
        </BarTable>
      </div>
      <SimpleHand
        hand={view.me.hand}
        selected={handCard}
        enabled={canPlay}
        onSelect={toggleHandCard}
      />
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

function SevenHalfBoard({ view, onAction }: { view: ClassicPlayerView; onAction: GameActionSender }) {
  const canDraw = view.me.availableActions.includes('drawDeck');
  const canStand = view.me.availableActions.includes('stand');
  const meIsBust = view.bustPlayerIds.includes(view.me.playerId);
  const showStatusMessage = meIsBust || view.status !== 'playing';
  const pendingAction = useRondaStore((state) => state.pendingAction);
  const banker = view.players.find((player) => player.playerId === view.bankerPlayerId);
  const tableLayout = sevenHalfTableLayout(view.players.length);
  const compactTable = tableLayout === 'five-six' || tableLayout === 'seven';
  const revealedHands = new Map(
    view.revealedHands.map((hand) => [hand.playerId, hand.cards] as const),
  );
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
        <section
          className={`seven-half-board__players seven-half-board__players--${tableLayout}`}
          aria-label="Estado de los jugadores"
        >
          <div className="seven-half-board__players-heading">
            <strong>Estado de la mesa</strong>
            <span>Se revelan al plantarse</span>
          </div>
          <ul className={`seven-half-players seven-half-players--${tableLayout}`}>
            {view.players.map((player, index) => (
              <SevenHalfPlayerCard
                key={player.playerId}
                player={player}
                isMe={player.playerId === view.me.playerId}
                isBanker={player.playerId === view.bankerPlayerId}
                isTurn={player.playerId === view.turnPlayerId}
                isBust={view.bustPlayerIds.includes(player.playerId)}
                total={player.playerId === view.me.playerId ? view.me.total : (view.totals[index] ?? null)}
                cards={revealedHands.get(player.playerId) ?? []}
                handCount={player.handCount}
                compact={compactTable}
              />
            ))}
          </ul>
          <p className="seven-half-board__visibility">
            Las manos activas permanecen ocultas. Cuando alguien se planta o se pasa, sus cartas quedan visibles.
          </p>
        </section>
      </div>
      <SevenHalfHand view={view} layout={tableLayout} />
      {showStatusMessage ? (
        <div className="seven-half-actions seven-half-actions--notice action-dock flex shrink-0 items-center justify-center px-4 py-3">
          <p className="seven-half-reveal-message" role="status" aria-live="polite">
            <strong>{meIsBust ? 'Te has pasado' : 'Ronda terminada'}</strong>
            <span>{meIsBust ? 'No puedes pedir más cartas.' : 'Mostrando las cartas de la mesa.'}</span>
          </p>
        </div>
      ) : (
        <div className="seven-half-actions action-dock grid shrink-0 grid-cols-2 gap-2 px-4 pt-3">
          <Button
            variant="ghost"
            disabled={!canStand || pendingAction}
            loading={pendingAction}
            onClick={() => onAction({ type: 'stand' })}
          >
            Plantarse · {formatSevenHalfTotal(view.me.total)}
          </Button>
          <Button
            disabled={!canDraw || pendingAction}
            loading={pendingAction}
            onClick={() => onAction({ type: 'drawDeck' })}
          >
            Pedir carta
          </Button>
        </div>
      )}
    </>
  );
}

function SevenHalfPlayerCard({
  player,
  isMe,
  isBanker,
  isTurn,
  isBust,
  total,
  cards,
  handCount,
  compact,
}: {
  player: PublicPlayer;
  isMe: boolean;
  isBanker: boolean;
  isTurn: boolean;
  isBust: boolean;
  total: number | null;
  cards: readonly CardId[];
  handCount: number;
  compact: boolean;
}) {
  const revealed = cards.length > 0;
  const status = isBust
    ? 'Se pasó'
    : total !== null
      ? formatSevenHalfTotal(total)
      : isTurn
        ? isMe
          ? 'Tu turno'
          : 'En juego'
        : isBanker
          ? 'Banca'
          : 'Esperando';

  return (
    <li
      className={`seven-half-player ${isMe ? 'seven-half-player--me' : ''} ${isBust ? 'seven-half-player--bust' : ''}`}
    >
      <div className="seven-half-player__head">
        <span className="seven-half-player__name">
          {player.nick}
          {isMe ? ' · tú' : ''}
        </span>
        <span className="seven-half-player__status">{status}</span>
      </div>
      <div className="seven-half-player__cards">
        {isMe ? (
          <span className="seven-half-player__hidden">Tu mano está abajo</span>
        ) : revealed ? (
          <MiniCardFan cards={cards} overlap={cards.length > 3} />
        ) : (
          <SevenHalfHiddenHand count={handCount} compact={compact} isBanker={isBanker} />
        )}
      </div>
      {!isMe && revealed ? <span className="seven-half-player__revealed">Cartas visibles</span> : null}
    </li>
  );
}

function SevenHalfHiddenHand({
  count,
  compact,
  isBanker,
}: {
  count: number;
  compact: boolean;
  isBanker: boolean;
}) {
  const backCount = Math.min(count, compact ? 1 : 2);
  const label = `${isBanker ? 'Banca · ' : ''}${count} carta${count === 1 ? '' : 's'} oculta${count === 1 ? '' : 's'}`;

  return (
    <div className="seven-half-hidden-hand" aria-label={label}>
      <div className="seven-half-hidden-hand__backs" aria-hidden="true">
        {Array.from({ length: backCount }, (_, index) => (
          <span key={index} className="seven-half-hidden-hand__back">
            <CardBack width={compact ? 18 : 22} height={compact ? 27 : 33} />
          </span>
        ))}
      </div>
      <span className="seven-half-player__hidden">{label}</span>
    </div>
  );
}

function formatSevenHalfTotal(total: number | null): string {
  return total === null ? '—' : String(total).replace('.', ',');
}

type SevenHalfTableLayout = 'two' | 'three-four' | 'five-six' | 'seven';

function sevenHalfTableLayout(playerCount: number): SevenHalfTableLayout {
  if (playerCount <= 2) return 'two';
  if (playerCount <= 4) return 'three-four';
  if (playerCount <= 6) return 'five-six';
  return 'seven';
}

function sevenHalfPlayerInfo(view: ClassicPlayerView, player: PublicPlayer): string {
  const index = view.players.findIndex((candidate) => candidate.playerId === player.playerId);
  const total = player.playerId === view.me.playerId ? view.me.total : (view.totals[index] ?? null);
  if (view.bustPlayerIds.includes(player.playerId)) return 'se pasó';
  if (total !== null) return formatSevenHalfTotal(total);
  if (view.turnPlayerId === player.playerId) return 'en juego';
  return `${player.handCount} carta${player.handCount === 1 ? '' : 's'} oculta${player.handCount === 1 ? '' : 's'}`;
}

function SevenHalfHand({
  view,
  layout,
}: {
  view: ClassicPlayerView;
  layout: SevenHalfTableLayout;
}) {
  const bust = view.bustPlayerIds.includes(view.me.playerId);
  const status = bust
    ? 'Te has pasado'
    : view.me.total === 7.5
      ? 'Siete y media'
      : `${formatSevenHalfTotal(view.me.total)} puntos`;

  return (
    <section className={`game-hand seven-half-hand seven-half-hand--${layout} shrink-0`}>
      <div className="seven-half-hand__header">
        <h2 className="text-14 font-semibold text-hueso">Tu mano</h2>
        <span className={`font-mono text-12 ${bust ? 'text-brasa' : 'text-humo'}`}>{status}</span>
      </div>
      <div className="seven-half-hand__cards">
        {view.me.hand.map((cardId) => (
          <span key={cardId} className="seven-half-hand__card">
            <PlayingCard cardId={cardId} size="sm" />
          </span>
        ))}
      </div>
    </section>
  );
}

function CinquilloBoard({ view, onAction }: { view: ClassicPlayerView; onAction: GameActionSender }) {
  const canPlay = view.me.availableActions.includes('playCard');
  const canPass = view.me.availableActions.includes('pass');
  return (
    <>
      <div className="classic-table-stage flex min-h-0 flex-1 items-center justify-center">
        <BarTable className="w-full max-w-[360px]">
          <CinquilloTable cards={view.tableCards} variant="compact" />
        </BarTable>
      </div>
      <div data-card-drop-target={canPlay ? 'pocha' : undefined}>
        <PochaHand
          hand={view.me.hand}
          legalCardIds={view.me.legalCardIds}
          canPlay={canPlay}
          onPlay={(cardId) => onAction({ type: 'playCard', cardId })}
        />
      </div>
      {canPass ? (
        <div className="shrink-0 px-4 pb-4">
          <Button variant="ghost" className="w-full" onClick={() => onAction({ type: 'pass' })}>
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
    <section className="game-hand escoba-hand shrink-0">
      <h2 className="escoba-hand__title text-14 font-semibold text-hueso">Tu mano</h2>
      {/* Forzamos una nueva capa cuando cambia el contenido de la mano. Esto
          evita que WebKit conserve el búfer del drop-shadow de una carta que
          ya se ha jugado al retirar su nodo SVG. */}
      <div
        key={hand.join('|')}
        className="escoba-hand-cards flex items-end gap-1 overflow-x-auto px-4 pb-2"
      >
        {hand.map((cardId) => (
          <button
            key={cardId}
            type="button"
            disabled={!enabled}
            aria-pressed={selected === cardId}
            onClick={() => onSelect(cardId)}
            className={`escoba-hand-card ${selected === cardId ? 'escoba-hand-card--selected' : ''}`}
          >
            <PlayingCard cardId={cardId} size="md" selected={selected === cardId} />
          </button>
        ))}
      </div>
    </section>
  );
}
