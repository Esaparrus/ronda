// Barra de estado inferior. Contrato P14, ampliado a petición de Unai: ya no
// lleva botones de robar/descartar/cerrar (esa acción ahora se hace tocando
// el mazo/descarte y con doble toque o arrastre en la mano, ver Hand.tsx y
// GameScreen.tsx) -- se queda solo con el texto de estado ("te toca",
// "esperando a X") y el anuncio para lectores de pantalla, que siguen
// siendo útiles independientemente de cómo se juegue la carta.
'use client';

import { useEffect, useRef, useState } from 'react';
import type { PlayerId, TurnPhase } from '@ronda/protocol';

export interface ActionBarProps {
  isMyTurn: boolean;
  turnPhase: TurnPhase;
  turnPlayerId: PlayerId | null;
  turnPlayerNick: string | null;
  turnPlayerConnected: boolean;
}

export function ActionBar({
  isMyTurn,
  turnPhase,
  turnPlayerId,
  turnPlayerNick,
  turnPlayerConnected,
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

  const myTurnHint =
    turnPhase === 'draw'
      ? 'Toca el mazo o el descarte para robar.'
      : 'Suelta una carta sobre el montón.';

  // Anuncio de cambio de turno para lectores de pantalla (contrato P18:
  // "aria-live para el cambio de turno"). Región siempre presente y visible
  // solo a tecnología de asistencia (sr-only): el texto visible de cada
  // rama de abajo ya cumple "máximo 12 palabras" (§8.5.3), así que este
  // anuncio no duplica esa interfaz, solo la hace audible en el momento
  // exacto en que cambia el turno (aria-live="polite": espera a que el
  // lector termine lo que esté diciendo, no interrumpe).
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
