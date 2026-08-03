// Reacciones que se ven flotar. Roadmap "Después del MVP" §2.
//
// Se monta una vez por pantalla (móvil y pantalla central) y pinta lo que
// llega por el evento `reaction` del socket, incluido lo que manda uno
// mismo: el servidor difunde a todos por igual, así que nadie pinta nada
// "en local" y todo el mundo ve lo mismo en el mismo momento.
//
// Cada reacción vive REACTION_TTL_MS y se poda sola: el temporizador que lo
// hace es de este componente, no del store, para que la poda ocurra solo
// mientras hay algo en pantalla.
'use client';

import { useEffect } from 'react';
import { REACTION_TTL_MS } from '@ronda/protocol';
import { REACTION_FACES } from '@/lib/reactions';
import { useRondaStore } from '@/lib/store';

export interface ReactionOverlayProps {
  /** 'mesa' = pantalla central (tele): todo más grande y más arriba. */
  variant?: 'movil' | 'mesa';
}

export function ReactionOverlay({ variant = 'movil' }: ReactionOverlayProps) {
  const reactions = useRondaStore((s) => s.reactions);
  const view = useRondaStore((s) => s.view);

  useEffect(() => {
    if (reactions.length === 0) return;
    // Una sola espera por render: al vencer la más vieja, el store poda
    // todas las caducadas y este efecto se vuelve a programar si quedan.
    const oldest = reactions[0];
    if (!oldest) return;
    const remaining = Math.max(0, REACTION_TTL_MS - (Date.now() - oldest.receivedAt));
    const t = setTimeout(() => useRondaStore.getState().pruneReactions(), remaining + 50);
    return () => clearTimeout(t);
  }, [reactions]);

  if (reactions.length === 0) return null;

  const isMesa = variant === 'mesa';

  return (
    <div
      // `pointer-events-none`: nunca debe tapar un botón ni robar un toque.
      // `aria-live="polite"`: quien no ve la pantalla se entera de quién ha
      // reaccionado, sin interrumpir lo que esté leyendo.
      className={`pointer-events-none fixed inset-x-0 z-40 flex flex-col items-center gap-2 ${
        isMesa ? 'bottom-12' : 'bottom-28'
      }`}
      aria-live="polite"
    >
      {reactions.map((r) => {
        const face = REACTION_FACES[r.reaction];
        const player = view?.players.find((p) => p.playerId === r.playerId);
        return (
          <div
            key={r.key}
            className={`flex items-center gap-2 rounded-lg border border-linea bg-mesa px-3 py-1 ${
              isMesa ? 'text-28' : 'text-20'
            }`}
            style={{
              animation: `reaction-float ${REACTION_TTL_MS}ms ease-out forwards`,
              borderColor: player ? `var(--seat-${player.colorIndex})` : undefined,
            }}
          >
            <span aria-hidden="true">{face.emoji}</span>
            <span className={`text-hueso ${isMesa ? 'text-20' : 'text-14'}`}>
              {player?.nick ?? 'Alguien'}
            </span>
            <span className="sr-only">{face.label}</span>
          </div>
        );
      })}
    </div>
  );
}
