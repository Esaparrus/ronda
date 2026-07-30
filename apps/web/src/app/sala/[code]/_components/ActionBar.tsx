// Barra de acción inferior: una sola acción principal, nunca dos a la vez
// (contrato P14, criterio de aceptación explícito).
//
// Interpretación de una aparente tensión del contrato: la fase de descarte
// dice "«Descartar» o «Cerrar» si me.canClose y la carta seleccionada está
// en me.closableDiscards" — se lee como DOS ESTADOS MUTUAMENTE EXCLUYENTES
// de un único botón (mismo hueco, mismo tamaño, cambia label+acción según
// si la carta seleccionada cierra o no), no como dos botones simultáneos.
// Así se respeta "nunca dos botones principales a la vez" sin renunciar a
// ofrecer el cierre en cuanto sea posible.
'use client';

import { useEffect, useRef, useState } from 'react';
import type { AvailableAction, CardId, PlayerId, TurnPhase } from '@ronda/protocol';
import { Button } from '@/components/ui/Button';

export interface ActionBarProps {
  isMyTurn: boolean;
  turnPhase: TurnPhase;
  turnPlayerId: PlayerId | null;
  turnPlayerNick: string | null;
  turnPlayerConnected: boolean;
  availableActions: AvailableAction[];
  selected: CardId | null;
  canClose: boolean;
  closableDiscards: CardId[];
  pendingAction: boolean;
  /** Contrato P17: acciones bloqueadas mientras no haya conexión sana. */
  offline: boolean;
  onDrawDeck: () => void;
  onDiscard: (cardId: CardId) => void;
  onClose: (cardId: CardId) => void;
}

export function ActionBar({
  isMyTurn,
  turnPhase,
  turnPlayerId,
  turnPlayerNick,
  turnPlayerConnected,
  availableActions,
  selected,
  canClose,
  closableDiscards,
  pendingAction,
  offline,
  onDrawDeck,
  onDiscard,
  onClose,
}: ActionBarProps) {
  // "Esperando a {nick}, N s": el protocolo no manda una marca de tiempo de
  // desconexión (PublicPlayer solo trae `connected: boolean`), así que los
  // segundos transcurridos son una aproximación calculada en el cliente
  // -desde el primer render en que vemos ese jugador desconectado- y se
  // reinician si se recarga la página. Se marca como tal en el informe
  // final; no es un dato del servidor.
  const disconnectedSince = useRef<Map<PlayerId, number>>(new Map());
  const [, tick] = useState(0);

  useEffect(() => {
    if (!turnPlayerId) return;
    if (!turnPlayerConnected) {
      if (!disconnectedSince.current.has(turnPlayerId)) {
        disconnectedSince.current.set(turnPlayerId, Date.now());
      }
    } else {
      disconnectedSince.current.delete(turnPlayerId);
    }
  }, [turnPlayerId, turnPlayerConnected]);

  useEffect(() => {
    if (isMyTurn || turnPlayerConnected) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [isMyTurn, turnPlayerConnected]);

  if (!isMyTurn) {
    if (!turnPlayerId || !turnPlayerNick) return <div className="px-6 py-4" />;
    if (!turnPlayerConnected) {
      const since = disconnectedSince.current.get(turnPlayerId) ?? Date.now();
      const seconds = Math.max(0, Math.floor((Date.now() - since) / 1000));
      return (
        <div className="px-6 py-4 text-center">
          <p className="text-16 text-hueso">
            Esperando a {turnPlayerNick}, {seconds} s
          </p>
        </div>
      );
    }
    return (
      <div className="px-6 py-4 text-center">
        <p className="text-16 text-hueso">Le toca a {turnPlayerNick}</p>
      </div>
    );
  }

  if (turnPhase === 'draw') {
    return (
      <div className="px-6 py-4">
        <Button
          onClick={onDrawDeck}
          disabled={pendingAction || offline || !availableActions.includes('drawDeck')}
        >
          Robar del mazo
        </Button>
      </div>
    );
  }

  // turnPhase === 'discard'
  const willClose = selected !== null && canClose && closableDiscards.includes(selected);

  return (
    <div className="px-6 py-4">
      <Button
        onClick={() => {
          if (!selected) return;
          if (willClose) onClose(selected);
          else onDiscard(selected);
        }}
        disabled={pendingAction || offline || !selected}
      >
        {willClose ? 'Cerrar' : 'Descartar'}
      </Button>
    </div>
  );
}
