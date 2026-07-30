// Pantalla de partida ("Partida" en el contrato P14): estructura vertical
// fija -- Banda de conexión (la monta <SalaClient>, no aquí), Fila de
// jugadores con hilo de turno, Zona común (mazo + descarte), Mano en el
// tercio inferior, Barra de acción. Todo el estado de reglas viene ya
// resuelto del servidor en `view`; aquí solo se traduce a interacción.
'use client';

import { useState } from 'react';
import type { CardId, PlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { PlayerStrip } from './PlayerStrip';
import { CommonArea } from './CommonArea';
import { Hand } from './Hand';
import { ActionBar } from './ActionBar';

export interface GameScreenProps {
  view: PlayerView;
}

export function GameScreen({ view }: GameScreenProps) {
  const [selected, setSelected] = useState<CardId | null>(null);
  const pendingAction = useRondaStore((s) => s.pendingAction);
  const offline = useRondaStore((s) => s.connection !== 'online');

  const { me } = view;
  const myPlayer = view.players.find((p) => p.playerId === me.playerId);
  const myColorIndex = myPlayer?.colorIndex ?? 0;
  const isMyTurn = view.turnPlayerId === me.playerId;
  const turnPlayer = view.turnPlayerId
    ? (view.players.find((p) => p.playerId === view.turnPlayerId) ?? null)
    : null;

  function handleSelect(cardId: CardId) {
    // Alterna: tocar la carta ya seleccionada la deselecciona.
    setSelected((prev) => (prev === cardId ? null : cardId));
  }

  function handleDrawDeck() {
    void useRondaStore.getState().sendAction({ type: 'drawDeck' });
  }

  function handleDrawDiscard() {
    void useRondaStore.getState().sendAction({ type: 'drawDiscard' });
  }

  function handleDiscard(cardId: CardId) {
    setSelected(null);
    void useRondaStore.getState().sendAction({ type: 'discard', cardId });
  }

  function handleClose(cardId: CardId) {
    setSelected(null);
    void useRondaStore.getState().sendAction({ type: 'close', cardId });
  }

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
        onDrawDiscard={canDrawDiscard ? handleDrawDiscard : undefined}
      />

      <div className="mt-auto flex flex-col">
        <Hand
          hand={me.hand}
          bestMelds={me.bestMelds}
          lockedCardId={me.lockedCardId}
          selected={selected}
          onSelect={handleSelect}
          myColorIndex={myColorIndex}
          jokerPoints={view.config.jokerPoints}
        />

        <ActionBar
          isMyTurn={isMyTurn}
          turnPhase={view.turnPhase}
          turnPlayerId={view.turnPlayerId}
          turnPlayerNick={turnPlayer?.nick ?? null}
          turnPlayerConnected={turnPlayer?.connected ?? true}
          availableActions={me.availableActions}
          selected={selected}
          canClose={me.canClose}
          closableDiscards={me.closableDiscards}
          pendingAction={pendingAction}
          offline={offline}
          onDrawDeck={handleDrawDeck}
          onDiscard={handleDiscard}
          onClose={handleClose}
        />
      </div>
    </div>
  );
}
