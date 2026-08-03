// Pantalla de partida de Pocha. Mismo esqueleto vertical que GameScreen.tsx
// (Chinchón): fila de jugadores, zona común, mano, barra de acción -- pero
// con cantes y bazas en vez de mazo/descarte/combinaciones.
'use client';

import type { PochaPlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { PlayerStrip } from './PlayerStrip';
import { PochaBidRow } from './PochaBidRow';
import { PochaTrickArea } from './PochaTrickArea';
import { PochaHand } from './PochaHand';
import { PochaBidPicker } from './PochaBidPicker';
import { PochaActionBar } from './PochaActionBar';

export interface PochaGameScreenProps {
  view: PochaPlayerView;
}

export function PochaGameScreen({ view }: PochaGameScreenProps) {
  const { me } = view;
  const isMyTurn = view.turnPlayerId === me.playerId;
  const turnPlayer = view.turnPlayerId
    ? (view.players.find((p) => p.playerId === view.turnPlayerId) ?? null)
    : null;
  // Fase de cante mientras algún jugador activo no haya cantado todavía; en
  // cuanto todos cantaron, la ronda queda en fase de bazas hasta el final
  // (los bids no se reinician hasta la siguiente ronda). Solo para elegir
  // el texto de la barra de estado -- la legalidad siempre la decide el
  // servidor (`me.availableActions`/`me.legalCardIds`).
  const bidding = view.bids.some((b) => b === null);
  const canBid = isMyTurn && me.availableActions.includes('bid');
  const canPlay = isMyTurn && me.availableActions.includes('playCard');

  function handleBid(amount: number) {
    void useRondaStore.getState().sendAction({ type: 'bid', amount });
  }

  function handlePlay(cardId: string) {
    void useRondaStore.getState().sendAction({ type: 'playCard', cardId });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <PlayerStrip players={view.players} turnPlayerId={view.turnPlayerId} myPlayerId={me.playerId} />
      <PochaBidRow players={view.players} bids={view.bids} tricksWon={view.tricksWon} />

      <PochaTrickArea
        trumpCardId={view.trumpCardId}
        currentTrick={view.currentTrick}
        players={view.players}
      />

      <div className="mt-auto flex flex-col">
        <PochaHand hand={me.hand} legalCardIds={me.legalCardIds} canPlay={canPlay} onPlay={handlePlay} />

        <PochaActionBar
          isMyTurn={isMyTurn}
          bidding={bidding}
          turnPlayerId={view.turnPlayerId}
          turnPlayerNick={turnPlayer?.nick ?? null}
          turnPlayerConnected={turnPlayer?.connected ?? true}
        />
      </div>

      <PochaBidPicker open={canBid} roundSize={view.roundSize} onConfirm={handleBid} />
    </div>
  );
}
