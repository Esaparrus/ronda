// Anillo de asientos alrededor del centro (mazo + descarte), con el hilo de
// turno recorriendo el anillo entre asientos. Contrato P15 / §8.4
// ("elemento firma"). Vista SIEMPRE de tipo TableView: nunca lee `me`.
//
// Geometría: cada asiento se coloca con el truco clásico de CSS
// `rotate(ángulo) translateY(-radio) rotate(-ángulo)` -- la primera
// rotación mueve el punto de origen alrededor del círculo, `translateY`
// lo empuja hacia fuera a lo largo de ese radio, y la segunda rotación
// (inversa) endereza el contenido del asiento para que el apodo y el
// avatar no queden inclinados. El radio se expresa con `clamp()` (modo
// «distancia», contrato P15) para que el anillo se vea bien tanto en
// 1280x720 como en 1920x1080 sin recalcular nada en JS.
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PlayerId, PublicPlayer } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';
import { Pile } from '@/components/cards/Pile';

export interface SeatRingProps {
  players: PublicPlayer[];
  turnPlayerId: PlayerId | null;
  /** Contenido extra bajo la puntuación de cada asiento (p.ej. cante/bazas
   * de Pocha). No usado por Chinchón -- geometría del anillo sin cambios. */
  renderBadge?: (p: PublicPlayer) => ReactNode;
  /**
   * Si se pinta la puntuación del jugador. Mus la apaga: ahí `score` va
   * siempre a 0 porque puntúa la pareja (§12.12), y un 0 gigante bajo cada
   * asiento sería un número inventado. Su marcador va en otro sitio.
   */
  showScore?: boolean;
}

const RADIUS = 'clamp(150px, 34vmin, 280px)';
const THREAD_RADIUS = 'clamp(170px, 38vmin, 310px)';

function seatTransform(angleDeg: number, radius: string): string {
  return `translate(-50%, -50%) rotate(${angleDeg}deg) translateY(calc(0px - ${radius})) rotate(${-angleDeg}deg)`;
}

function threadTransform(angleDeg: number, radius: string): string {
  return `translate(-50%, -50%) rotate(${angleDeg}deg) translateY(calc(0px - ${radius}))`;
}

export function SeatRing({ players, turnPlayerId, renderBadge, showScore = true }: SeatRingProps) {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  const seatCount = Math.max(ordered.length, 1);
  const angleStep = 360 / seatCount;
  const turnIndex = turnPlayerId ? ordered.findIndex((p) => p.playerId === turnPlayerId) : -1;

  // Rotación ACUMULADA (sin envolver a 360°). Cada transición toma el camino
  // circular más corto, de modo que refleja tanto el sentido antihorario de
  // los juegos tradicionales como los giros de La Ronda.
  const [rotation, setRotation] = useState(0);
  const prevIndexRef = useRef<number | null>(null);

  useEffect(() => {
    if (turnIndex < 0) return;
    const prev = prevIndexRef.current;
    if (prev === null) {
      setRotation(turnIndex * angleStep);
    } else if (prev !== turnIndex) {
      let steps = turnIndex - prev;
      if (steps > seatCount / 2) steps -= seatCount;
      if (steps < -seatCount / 2) steps += seatCount;
      setRotation((r) => r + steps * angleStep);
    }
    prevIndexRef.current = turnIndex;
  }, [turnIndex, angleStep, seatCount]);

  return (
    <div className="pointer-events-none absolute inset-0">
      {ordered.map((p, i) => {
        const angle = i * angleStep;
        const handBacks = Array.from({ length: Math.min(p.handCount, 8) }, (_, k) => `back-${k}`);
        return (
          <div
            key={p.playerId}
            className="mesa-seat absolute left-1/2 top-1/2 flex flex-col items-center gap-1"
            style={{ transform: seatTransform(angle, RADIUS) }}
          >
            <Avatar
              name={p.nick}
              colorIndex={p.colorIndex}
              size={56}
              className={p.connected ? '' : 'opacity-40'}
            />
            <span className="text-[clamp(1rem,1.8vw,1.5rem)] text-hueso">{p.nick}</span>
            <div className="flex h-10 w-14 items-center justify-center">
              <div className="scale-[0.55]">
                <Pile cards={handBacks} faceDown size="sm" />
              </div>
            </div>
            {showScore ? (
              <span className="font-mono text-[clamp(1.25rem,2.2vw,2rem)] text-hueso">
                {p.score}
              </span>
            ) : null}
            {renderBadge ? renderBadge(p) : null}
          </div>
        );
      })}

      {turnIndex >= 0 ? (
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 h-1 w-14 rounded-full bg-oro shadow-[0_0_18px_rgba(0,122,255,0.48)]"
          style={{
            transform: threadTransform(rotation, THREAD_RADIUS),
            transition: 'transform 250ms ease-out',
          }}
        />
      ) : null}
    </div>
  );
}
