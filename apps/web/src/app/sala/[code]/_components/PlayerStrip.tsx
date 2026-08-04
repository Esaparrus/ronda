// Fila de jugadores + el hilo de turno (elemento firma, contrato §8.4): una
// línea de 2px en --brasa que viaja de un asiento al siguiente en 250ms
// ease-out (en vez de encenderse/apagarse). Se desactiva sola con
// prefers-reduced-motion vía la regla global de transition-duration en
// globals.css (P10): no hace falta comprobarlo aquí.
import type { ReactNode } from 'react';
import type { PlayerId, PublicPlayer } from '@ronda/protocol';
import { Avatar } from '@/components/ui/Avatar';

export interface PlayerStripProps {
  players: PublicPlayer[];
  turnPlayerId: PlayerId | null;
  myPlayerId: PlayerId;
  /**
   * Qué se pinta bajo cada apodo. Por defecto, "cartas · puntos", que es lo
   * que dicen Chinchón y Pocha. Mus necesita otra cosa: ahí `score` va
   * siempre a 0 porque puntúa la pareja (§12.12) y enseñar un 0 sería
   * mentir. Mismo mecanismo que `renderBadge` de SeatRing en /mesa.
   */
  renderInfo?: (player: PublicPlayer) => ReactNode;
}

export function PlayerStrip({
  players,
  turnPlayerId,
  myPlayerId,
  renderInfo,
}: PlayerStripProps) {
  const ordered = [...players].sort((a, b) => a.seat - b.seat);
  const seatCount = Math.max(ordered.length, 1);
  const turnIndex = turnPlayerId ? ordered.findIndex((p) => p.playerId === turnPlayerId) : -1;

  return (
    <div className="relative flex gap-1 border-b border-linea px-2 py-2">
      {ordered.map((p) => (
        <div key={p.playerId} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <Avatar
            name={p.nick}
            colorIndex={p.colorIndex}
            size={32}
            className={p.connected ? '' : 'opacity-40'}
          />
          <span className="max-w-full truncate text-12 text-hueso">
            {p.nick}
            {p.playerId === myPlayerId ? ' (tú)' : ''}
          </span>
          <span className="font-mono text-12 text-humo">
            {renderInfo ? renderInfo(p) : `${p.handCount} · ${p.score}`}
          </span>
        </div>
      ))}
      {turnIndex >= 0 ? (
        <div
          aria-hidden="true"
          className="absolute bottom-0 h-0.5 bg-brasa"
          style={{
            width: `${100 / seatCount}%`,
            left: `${(turnIndex / seatCount) * 100}%`,
            transition: 'left 250ms ease-out',
          }}
        />
      ) : null}
    </div>
  );
}
