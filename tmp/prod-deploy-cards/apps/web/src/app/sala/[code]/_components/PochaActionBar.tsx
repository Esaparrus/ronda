// Barra de estado inferior de Pocha. Mismo esqueleto que ActionBar.tsx
// (Chinchón), incluida la cuenta de segundos de "esperando a X
// desconectado" -- el texto de "te toca" distingue cantar vs jugar carta
// mirando `me.availableActions`; para el turno de otro, la fase se infiere
// solo para el texto (nunca para decidir legalidad, que siempre viene del
// servidor).
'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayerId } from '@ronda/protocol';

export interface PochaActionBarProps {
  isMyTurn: boolean;
  /** true si la ronda todavía está cantando (algún jugador sin cante); false = fase de bazas. */
  bidding: boolean;
  turnPlayerId: PlayerId | null;
  turnPlayerNick: string | null;
  turnPlayerConnected: boolean;
}

export function PochaActionBar({
  isMyTurn,
  bidding,
  turnPlayerId,
  turnPlayerNick,
  turnPlayerConnected,
}: PochaActionBarProps) {
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

  const myTurnHint = bidding ? 'Elige cuántas bazas crees que vas a ganar.' : 'Toca una carta para jugarla.';

  const announcement = !isMyTurn
    ? turnPlayerNick
      ? turnPlayerConnected
        ? `Le toca a ${turnPlayerNick}.`
        : `Esperando a ${turnPlayerNick}.`
      : ''
    : `Te toca. ${myTurnHint}`;

  const liveRegion = (
    <p className="sr-only" aria-live="polite" role="status">
      {announcement}
    </p>
  );

  if (!isMyTurn) {
    if (!turnPlayerId || !turnPlayerNick) return <div className="action-dock px-6 py-4" />;
    if (!turnPlayerConnected) {
      const since = disconnectedSince.current.get(turnPlayerId) ?? Date.now();
      const seconds = Math.max(0, Math.floor((Date.now() - since) / 1000));
      return (
        <div className="action-dock px-6 py-4 text-center">
          {liveRegion}
          <p className="text-16 text-hueso">
            Esperando a {turnPlayerNick}, {seconds} s
          </p>
        </div>
      );
    }
    return (
      <div className="action-dock px-6 py-4 text-center">
        {liveRegion}
        <p className="text-16 text-hueso">Le toca a {turnPlayerNick}</p>
      </div>
    );
  }

  return (
    <div className="action-dock px-6 py-4 text-center">
      {liveRegion}
      <p className="text-16 text-hueso">{myTurnHint}</p>
    </div>
  );
}
