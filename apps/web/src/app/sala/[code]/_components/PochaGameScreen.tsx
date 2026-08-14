// Pantalla de partida de Pocha. Mismo esqueleto vertical que GameScreen.tsx
// (Chinchón): fila de jugadores, la mesa, mano, barra de acción -- pero con
// cantes y bazas en vez de mazo/descarte/combinaciones.
//
// P32: Pocha se queda con <PlayerStrip> y <PochaBidRow> donde Chinchón y Mus
// pasan a sentar a la gente en el borde de la mesa. No es un olvido: Pocha
// admite SEIS jugadores (§10.7) y cinco asientos de 72px no caben en el
// borde de arriba de un móvil sin partirse en dos filas. La mesa de bar sí
// entra: el tapete de <BarTable> es donde se juega la baza.
'use client';

import { useState } from 'react';
import type { PochaPlayerView } from '@ronda/protocol';
import { useRondaStore } from '@/lib/store';
import { PlayerStrip } from './PlayerStrip';
import { PochaBidRow } from './PochaBidRow';
import { PochaTrickArea } from './PochaTrickArea';
import { PochaHand } from './PochaHand';
import { PochaBidPicker } from './PochaBidPicker';
import { PochaActionBar } from './PochaActionBar';
import { TableHeader } from './TableHeader';
import { BarTable } from '@/components/ui/BarTable';

export interface PochaGameScreenProps {
  view: PochaPlayerView;
}

export function PochaGameScreen({ view }: PochaGameScreenProps) {
  const [cardOverTable, setCardOverTable] = useState(false);
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
    <div className="game-shell flex min-h-0 flex-1 flex-col overflow-hidden">
      <TableHeader
        left={`Ronda ${view.round} · ${view.roundSize}`}
        turnNick={turnPlayer?.nick ?? null}
      />

      <PlayerStrip players={view.players} turnPlayerId={view.turnPlayerId} myPlayerId={me.playerId} />
      <PochaBidRow players={view.players} bids={view.bids} tricksWon={view.tricksWon} />

      <div className="flex min-h-0 flex-1 items-center justify-center px-1 py-2">
        <div
          data-card-drop-target={canPlay ? 'pocha' : undefined}
          className={`drop-zone w-full max-w-[340px] rounded-[18px] ${
            cardOverTable ? 'drop-zone-active' : ''
          }`}
        >
          <BarTable>
            <div className="flex flex-col items-center gap-2">
              {canPlay ? (
                <span className="drag-instruction">
                  {cardOverTable ? 'Suelta para jugar' : 'Juega aquí tu carta'}
                </span>
              ) : null}
              <PochaTrickArea
                trumpCardId={view.trumpCardId}
                currentTrick={view.currentTrick}
                players={view.players}
              />
            </div>
          </BarTable>
        </div>
      </div>

      <div className="flex shrink-0 flex-col">
        <PochaHand
          hand={me.hand}
          legalCardIds={me.legalCardIds}
          canPlay={canPlay}
          onPlay={handlePlay}
          onDropTargetChange={setCardOverTable}
        />

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
