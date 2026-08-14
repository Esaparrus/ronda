// Pantalla de partida ("Partida" en el contrato P14, remaquetada por P32):
// estructura vertical fija -- Banda de conexión (la monta <SalaClient>, no
// aquí), encabezado con el turno, la MESA con los jugadores sentados
// alrededor (rivales arriba, tú abajo) y el mazo y el descarte encima del
// tapete, Mano en el tercio inferior, Barra de acción. Todo el estado de
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
import { ActionBar } from './ActionBar';
import { TableHeader } from './TableHeader';
import { TableSeat, orderAroundMe } from './TableSeat';
import { BarTable } from '@/components/ui/BarTable';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';

// Huecos de garbanzo bajo cada asiento. En Chinchón el garbanzo cuenta lo
// que te ACERCA a quedarte fuera: los puntos acumulados, medidos contra
// `config.eliminationScore`. Ocho huecos porque es el mismo puñado que los
// amarrakos de Mus (§12.3), y así la fila significa lo mismo en los tres
// juegos: cuántos te faltan para que pase algo.
const BEAN_SLOTS = 8;

function beansForScore(score: number, eliminationScore: number): number {
  if (eliminationScore <= 0) return 0;
  const perBean = eliminationScore / BEAN_SLOTS;
  return Math.max(0, Math.min(BEAN_SLOTS, Math.ceil(score / perBean)));
}

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

  const { top, me: mySeat } = orderAroundMe(view.players, me.playerId);
  const beansFor = (score: number) => ({
    count: beansForScore(score, view.config.eliminationScore),
    total: BEAN_SLOTS,
    label: 'puntos acumulados',
  });

  return (
    <div className="game-shell flex min-h-dvh flex-col">
      <TurnTimerHeader
        key={`${view.turnPlayerId ?? 'sin-turno'}:${view.round}:${view.turnPhase}`}
        left={`Mano ${view.round}`}
        turnNick={turnPlayer?.nick ?? null}
        deadlineAt={view.turnDeadlineAt}
        durationSeconds={view.config.turnTimeSeconds}
      />

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[6px] px-1 py-2">
        <div className="flex min-h-[60px] items-end justify-center gap-4">
          {top.map((p) => (
            <TableSeat
              key={p.playerId}
              player={p}
              variant="top"
              isTurn={p.playerId === view.turnPlayerId}
              beans={beansFor(p.score)}
              info={`${p.handCount} · ${p.score}`}
            />
          ))}
        </div>

        <div
          data-drop-target={isMyTurn && view.turnPhase === 'discard' ? 'discard' : undefined}
          className={`drop-zone w-full max-w-[340px] rounded-[18px] ${
            activeDropTarget === 'discard' ? 'drop-zone-active' : ''
          }`}
        >
          <BarTable>
            <CommonArea
              deckCount={view.deckCount}
              discardTop={view.discardTop}
              discardCount={view.discardCount}
              onDrawDeck={canDrawDeck ? handleDrawDeck : undefined}
              onDrawDiscard={canDrawDiscard ? handleDrawDiscard : undefined}
              showDropTargets={isMyTurn && view.turnPhase === 'discard'}
              activeDropTarget={activeDropTarget}
            />
          </BarTable>
        </div>

        <div className="flex min-h-[46px] items-start justify-center">
          {mySeat ? (
            <TableSeat
              player={mySeat}
              variant="plate"
              isYou
              isTurn={isMyTurn}
              beans={beansFor(mySeat.score)}
              info={`${me.hand.length} · ${mySeat.score}`}
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col">
        <Hand
          hand={me.hand}
          lockedCardId={me.lockedCardId}
          selected={selected}
          onSelect={handleSelect}
          onCommit={handleCommit}
          onDropTargetChange={setActiveDropTarget}
        />

        <ActionBar
          isMyTurn={isMyTurn}
          turnPhase={view.turnPhase}
          turnPlayerId={view.turnPlayerId}
          turnPlayerNick={turnPlayer?.nick ?? null}
          turnPlayerConnected={turnPlayer?.connected ?? true}
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
