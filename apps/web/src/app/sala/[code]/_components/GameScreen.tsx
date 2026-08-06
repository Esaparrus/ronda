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

import { useState } from 'react';
import type { CardId, ChinchonPlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { CommonArea } from './CommonArea';
import type { DropTarget } from './CommonArea';
import { Hand } from './Hand';
import { ActionBar } from './ActionBar';
import { TableHeader } from './TableHeader';
import { TableSeat, orderAroundMe } from './TableSeat';
import { BarTable } from '@/components/ui/BarTable';

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

export function GameScreen({ view }: GameScreenProps) {
  const [selected, setSelected] = useState<CardId | null>(null);
  // Carta descartable que también cerraría la ronda, pendiente de que el
  // jugador confirme: cerrar (o chinchón) termina la ronda/partida, así que
  // no se dispara solo porque la carta lo permita -- puede preferir seguir
  // jugando para buscar una jugada mejor (0 puntos, chinchón...).
  const [activeDropTarget, setActiveDropTarget] = useState<DropTarget | null>(null);

  const { me } = view;
  const myPlayer = view.players.find((p) => p.playerId === me.playerId);
  // Chinchón nunca pasa de 4 jugadores (colorIndex 0-3): el color de combinación
  // (meldColor, PlayingCard.tsx) es deliberadamente solo esos 4 colores de palo,
  // aunque colorIndex esté ensanchado a 0-5 para Pocha (§10.7).
  const myColorIndex = ((myPlayer?.colorIndex ?? 0) % 4) as 0 | 1 | 2 | 3;
  const isMyTurn = view.turnPlayerId === me.playerId;
  const turnPlayer = view.turnPlayerId
    ? (view.players.find((p) => p.playerId === view.turnPlayerId) ?? null)
    : null;

  function handleSelect(cardId: CardId) {
    setSelected(cardId);
  }

  function handleDrawDeck() {
    void useRondaStore.getState().sendAction({ type: 'drawDeck' });
  }

  function handleDrawDiscard() {
    void useRondaStore.getState().sendAction({ type: 'drawDiscard' });
  }

  // Segundo toque sobre la carta ya seleccionada, o arrastrarla hacia la
  // mesa (Hand.tsx): descarta directamente, salvo que esa carta también
  // permita cerrar -- en ese caso se pregunta antes de decidir por el
  // jugador, porque cerrar es irreversible (termina la ronda o, si es
  // chinchón, la partida entera) y quizá prefiera seguir buscando mejor
  // jugada.
  function handleCommit(cardId: CardId, target: DropTarget) {
    setSelected(null);
    if (!isMyTurn || view.turnPhase !== 'discard') return;
    if (target === 'close') {
      if (!me.closableDiscards.includes(cardId)) return;
      void useRondaStore.getState().sendAction({ type: 'close', cardId });
      return;
    }
    void useRondaStore.getState().sendAction({ type: 'discard', cardId });
  }

  // "Seguir jugando": la misma carta se descarta normal, sin cerrar -- la
  // ronda continúa y la carta que cerraba se queda disponible por si
  // aparece una jugada mejor más adelante.
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
    <div className="flex min-h-dvh flex-col">
      <TableHeader left={`Mano ${view.round}`} turnNick={turnPlayer?.nick ?? null} />

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

        <BarTable>
          <CommonArea
            deckCount={view.deckCount}
            discardTop={view.discardTop}
            discardCount={view.discardCount}
            onDrawDeck={canDrawDeck ? handleDrawDeck : undefined}
            onDrawDiscard={canDrawDiscard ? handleDrawDiscard : undefined}
            showDropTargets={isMyTurn && view.turnPhase === 'discard'}
            activeDropTarget={activeDropTarget}
            canClose={me.canClose}
          />
        </BarTable>

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
          bestMelds={me.bestMelds}
          lockedCardId={me.lockedCardId}
          selected={selected}
          onSelect={handleSelect}
          onCommit={handleCommit}
          onDropTargetChange={setActiveDropTarget}
          closableDiscards={me.closableDiscards}
          myColorIndex={myColorIndex}
        />

        <ActionBar
          isMyTurn={isMyTurn}
          turnPhase={view.turnPhase}
          turnPlayerId={view.turnPlayerId}
          turnPlayerNick={turnPlayer?.nick ?? null}
          turnPlayerConnected={turnPlayer?.connected ?? true}
        />
      </div>

    </div>
  );
}
