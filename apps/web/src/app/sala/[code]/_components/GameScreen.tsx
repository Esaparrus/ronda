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

// Vocabulario de Chinchón (mazo/descarte, comodines, bestMelds...): el
// dispatcher (SalaClient.tsx) ya estrecha `PlayerView` antes de llegar aquí.
export interface GameScreenProps {
  view: ChinchonPlayerView;
}

export function GameScreen({ view }: GameScreenProps) {
  const [selected, setSelected] = useState<CardId | null>(null);

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
  // mesa (Hand.tsx): descarta, o cierra si es una de las cartas que cierran
  // la ronda. Sin botón de confirmación aparte -- la decisión discard/close
  // es la misma que antes tomaba el label del botón único de la barra.
  function handleCommit(cardId: CardId) {
    setSelected(null);
    if (!isMyTurn || view.turnPhase !== 'discard') return;
    const willClose = me.canClose && me.closableDiscards.includes(cardId);
    if (willClose) void useRondaStore.getState().sendAction({ type: 'close', cardId });
    else void useRondaStore.getState().sendAction({ type: 'discard', cardId });
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
    </div>
  );
}
