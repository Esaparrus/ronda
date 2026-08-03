// Pantalla de partida ("Partida" en el contrato P14): estructura vertical
// fija -- Banda de conexión (la monta <SalaClient>, no aquí), Fila de
// jugadores con hilo de turno, Zona común (mazo + descarte), Mano en el
// tercio inferior, Barra de acción. Todo el estado de reglas viene ya
// resuelto del servidor en `view`; aquí solo se traduce a interacción.
'use client';

import { useState } from 'react';
import type { CardId, ChinchonPlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { PlayerStrip } from './PlayerStrip';
import { CommonArea } from './CommonArea';
import { Hand } from './Hand';
import { ActionBar } from './ActionBar';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';

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
  const [pendingCloseCardId, setPendingCloseCardId] = useState<CardId | null>(null);

  const { me } = view;
  const myPlayer = view.players.find((p) => p.playerId === me.playerId);
  const myColorIndex = myPlayer?.colorIndex ?? 0;
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
  function handleCommit(cardId: CardId) {
    setSelected(null);
    if (!isMyTurn || view.turnPhase !== 'discard') return;
    const willClose = me.canClose && me.closableDiscards.includes(cardId);
    if (willClose) {
      setPendingCloseCardId(cardId);
      return;
    }
    void useRondaStore.getState().sendAction({ type: 'discard', cardId });
  }

  function handleConfirmClose() {
    if (!pendingCloseCardId) return;
    void useRondaStore.getState().sendAction({ type: 'close', cardId: pendingCloseCardId });
    setPendingCloseCardId(null);
  }

  // "Seguir jugando": la misma carta se descarta normal, sin cerrar -- la
  // ronda continúa y la carta que cerraba se queda disponible por si
  // aparece una jugada mejor más adelante.
  function handleDiscardInstead() {
    if (!pendingCloseCardId) return;
    void useRondaStore.getState().sendAction({ type: 'discard', cardId: pendingCloseCardId });
    setPendingCloseCardId(null);
  }

  const canDrawDeck =
    isMyTurn && view.turnPhase === 'draw' && me.availableActions.includes('drawDeck');
  const canDrawDiscard =
    isMyTurn && view.turnPhase === 'draw' && me.availableActions.includes('drawDiscard');

  return (
    <div className="flex min-h-dvh flex-col">
      <PlayerStrip
        players={view.players}
        turnPlayerId={view.turnPlayerId}
        myPlayerId={me.playerId}
      />

      <CommonArea
        deckCount={view.deckCount}
        discardTop={view.discardTop}
        discardCount={view.discardCount}
        onDrawDeck={canDrawDeck ? handleDrawDeck : undefined}
        onDrawDiscard={canDrawDiscard ? handleDrawDiscard : undefined}
      />

      <div className="mt-auto flex flex-col">
        <Hand
          hand={me.hand}
          bestMelds={me.bestMelds}
          lockedCardId={me.lockedCardId}
          selected={selected}
          onSelect={handleSelect}
          onCommit={handleCommit}
          myColorIndex={myColorIndex}
          jokerPoints={view.config.jokerPoints}
        />

        <ActionBar
          isMyTurn={isMyTurn}
          turnPhase={view.turnPhase}
          turnPlayerId={view.turnPlayerId}
          turnPlayerNick={turnPlayer?.nick ?? null}
          turnPlayerConnected={turnPlayer?.connected ?? true}
        />
      </div>

      <Sheet open={pendingCloseCardId !== null} onClose={() => setPendingCloseCardId(null)}>
        <div className="flex flex-col gap-4">
          <p className="text-16 text-hueso">Esa carta te permite cerrar la ronda.</p>
          <p className="text-14 text-humo">
            Si cierras, la ronda termina ahora mismo. Si prefieres seguir jugando, puedes descartarla
            sin cerrar y buscar una jugada mejor.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleDiscardInstead} className="flex-1">
              Seguir jugando
            </Button>
            <Button variant="primary" onClick={handleConfirmClose} className="flex-1">
              Cerrar ronda
            </Button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
