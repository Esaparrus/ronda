// Pantalla de partida ("Partida" en el contrato P14, remaquetada por P32):
// estructura vertical fija -- Banda de conexión (la monta <SalaClient>, no
// aquí), encabezado con el turno, la MESA con los jugadores sentados
// alrededor (rivales arriba, tú abajo) y el mazo y el descarte encima del
// tapete y Mano en el tercio inferior. Todo el estado de
// reglas viene ya resuelto del servidor en `view`; aquí solo se traduce a
// interacción.
//
// Lo que P32 se lleva de P14: la fila de jugadores con el hilo de turno
// (<PlayerStrip>). Con los jugadores sentados en la mesa, una fila aparte
// repetía la misma información en otro sitio de la pantalla. El turno pasa a
// marcarse en el aro del avatar y en el encabezado. <PlayerStrip> sigue vivo
// para Pocha, que reparte hasta 6 asientos y no cabe en el borde de la mesa.
'use client';

import { useEffect, useState } from 'react';
import type { CardId, ChinchonPlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { CommonArea } from './CommonArea';
import type { DropTarget } from './CommonArea';
import { Hand } from './Hand';
import { TableHeader } from './TableHeader';
import { TableSeat, orderAroundMe } from './TableSeat';
import { BarTable } from '@/components/ui/BarTable';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

// Vocabulario de Chinchón (mazo/descarte, comodines, bestMelds...): el
// dispatcher (SalaClient.tsx) ya estrecha `PlayerView` antes de llegar aquí.
export interface GameScreenProps {
  view: ChinchonPlayerView;
}

interface TurnTimerHeaderProps {
  left: string;
  turnNick: string | null;
  deadlineAt: number | null;
  durationSeconds: number;
}

/** Aísla el reloj para no repintar mesa, asientos y mano cuatro veces/segundo. */
function TurnTimerHeader({ left, turnNick, deadlineAt, durationSeconds }: TurnTimerHeaderProps) {
  const timerEnabled = durationSeconds > 0;
  const [fallbackDeadline] = useState(() =>
    timerEnabled && !deadlineAt ? Date.now() + durationSeconds * 1000 : null,
  );
  const effectiveDeadlineAt = deadlineAt ?? fallbackDeadline;
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!timerEnabled || !effectiveDeadlineAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [timerEnabled, effectiveDeadlineAt]);

  const secondsLeft =
    effectiveDeadlineAt && timerEnabled
      ? Math.max(0, Math.ceil((effectiveDeadlineAt - now) / 1000))
      : null;
  const timerLabel =
    secondsLeft === null
      ? null
      : `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(secondsLeft % 60).padStart(2, '0')}`;
  const timerProgress =
    effectiveDeadlineAt && timerEnabled
      ? Math.max(0, Math.min(1, (effectiveDeadlineAt - now) / (durationSeconds * 1000)))
      : null;
  const urgentAt = Math.min(10, Math.max(3, Math.ceil(durationSeconds * 0.2)));

  return (
    <TableHeader
      left={left}
      turnNick={turnNick}
      timerLabel={timerLabel}
      timerUrgent={secondsLeft !== null && secondsLeft <= urgentAt}
      timerProgress={timerProgress}
    />
  );
}

export function GameScreen({ view }: GameScreenProps) {
  const [selected, setSelected] = useState<CardId | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<DropTarget | null>(null);
  const [pendingCloseCard, setPendingCloseCard] = useState<CardId | null>(null);

  const { me } = view;
  const isMyTurn = view.turnPlayerId === me.playerId;
  const turnPlayer = view.turnPlayerId
    ? (view.players.find((p) => p.playerId === view.turnPlayerId) ?? null)
    : null;

  // Si el servidor avanza el turno (incluido un timeout) no debe quedar
  // abierta una confirmación perteneciente al estado anterior.
  useEffect(() => {
    setSelected(null);
    setPendingCloseCard(null);
  }, [view.round, view.turnPhase, view.turnPlayerId]);

  function handleSelect(cardId: CardId) {
    setSelected(cardId);
  }

  function handleDrawDeck() {
    void useRondaStore.getState().sendAction({ type: 'drawDeck' });
  }

  function handleDrawDiscard() {
    void useRondaStore.getState().sendAction({ type: 'drawDiscard' });
  }

  // Segundo toque sobre la carta ya seleccionada, o arrastrarla al montón.
  // Si ese descarte permite cerrar, la decisión sigue siendo del jugador:
  // puede cerrar ahora o descartar normalmente para buscar una mano mejor.
  function handleCommit(cardId: CardId, target: DropTarget) {
    if (!isMyTurn || view.turnPhase !== 'discard') return;
    if (target !== 'discard') return;
    if (me.closableDiscards.includes(cardId)) {
      setPendingCloseCard(cardId);
      return;
    }
    setSelected(null);
    void useRondaStore.getState().sendAction({
      type: 'discard',
      cardId,
    });
  }

  function resolveCloseChoice(closeRound: boolean) {
    if (!pendingCloseCard) return;
    const cardId = pendingCloseCard;
    setPendingCloseCard(null);
    setSelected(null);
    void useRondaStore.getState().sendAction({
      type: closeRound ? 'close' : 'discard',
      cardId,
    });
  }

  const canDrawDeck =
    isMyTurn && view.turnPhase === 'draw' && me.availableActions.includes('drawDeck');
  const canDrawDiscard =
    isMyTurn && view.turnPhase === 'draw' && me.availableActions.includes('drawDiscard');
  const visibleDiscardCards =
    view.discardCards ?? (view.discardTop ? [view.discardTop] : []);

  const { top, me: mySeat } = orderAroundMe(view.players, me.playerId);

  return (
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <TurnTimerHeader
        key={`${view.turnPlayerId ?? 'sin-turno'}:${view.round}:${view.turnPhase}`}
        left={`Mano ${view.round}`}
        turnNick={turnPlayer?.nick ?? null}
        deadlineAt={view.turnDeadlineAt}
        durationSeconds={view.config.turnTimeSeconds}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-hidden px-1 py-1.5">
        <div className="flex h-[70px] w-full max-w-[340px] shrink-0 items-end justify-evenly gap-1 overflow-hidden">
          {top.map((p) => (
            <TableSeat
              key={p.playerId}
              player={p}
              variant="top"
              isTurn={p.playerId === view.turnPlayerId}
              stats={{ handCount: p.handCount, score: p.score }}
            />
          ))}
        </div>

        <div className="game-table-stage flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden">
          <div
            data-drop-target={isMyTurn && view.turnPhase === 'discard' ? 'discard' : undefined}
            className={`game-table-frame drop-zone rounded-[18px] ${
              activeDropTarget === 'discard' ? 'drop-zone-active' : ''
            }`}
          >
            <BarTable>
              <CommonArea
                deckCount={view.deckCount}
                discardCards={visibleDiscardCards}
                discardCount={view.discardCount}
                onDrawDeck={canDrawDeck ? handleDrawDeck : undefined}
                onDrawDiscard={canDrawDiscard ? handleDrawDiscard : undefined}
                showDropTargets={isMyTurn && view.turnPhase === 'discard'}
                activeDropTarget={activeDropTarget}
              />
            </BarTable>
          </div>
        </div>
      </div>

      {mySeat ? (
        <div className="flex shrink-0 justify-center px-3 py-1.5">
          <TableSeat
            player={mySeat}
            variant="plate"
            isYou
            isTurn={isMyTurn}
            stats={{ handCount: me.hand.length, score: mySeat.score }}
          />
        </div>
      ) : null}

      <div className="flex shrink-0 flex-col">
        <Hand
          hand={me.hand}
          lockedCardId={me.lockedCardId}
          selected={selected}
          onSelect={handleSelect}
          onCommit={handleCommit}
          onDropTargetChange={setActiveDropTarget}
        />
      </div>

      <Sheet open={pendingCloseCard !== null} onClose={() => setPendingCloseCard(null)}>
        <div className="flex flex-col gap-4 pb-2 text-center">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-24 text-hueso">Ya puedes cerrar</h2>
            <p className="text-14 text-humo">¿Cierras la ronda o descartas y sigues jugando?</p>
          </div>
          <Button onClick={() => resolveCloseChoice(true)}>Cerrar la ronda</Button>
          <Button variant="ghost" onClick={() => resolveCloseChoice(false)}>
            Descartar y seguir
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
