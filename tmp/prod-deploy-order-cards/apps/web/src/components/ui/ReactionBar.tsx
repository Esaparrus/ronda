// Barra de reacciones rápidas. Roadmap "Después del MVP" §2 de
// 02-PAQUETES.md ("Reacciones rápidas (4 emojis, sin chat libre)").
//
// Cuatro botones y nada más: no hay campo de texto en ninguna parte de la
// app, y este componente es lo más cerca que se va a estar de un chat. El
// enfriamiento (REACTION_COOLDOWN_MS) se refleja aquí atenuando los cuatro
// botones, para que el rechazo del servidor no llegue nunca por sorpresa.
'use client';

import { useEffect, useRef, useState } from 'react';
import { REACTION_COOLDOWN_MS, type ReactionId } from '@ronda/protocol';
import { REACTION_FACES, REACTION_ORDER } from '@/lib/reactions';
import { useRondaStore } from '@/lib/store';

export interface ReactionBarProps {
  /** Clases extra del contenedor (posicionado por quien lo usa). */
  className?: string;
}

export function ReactionBar({ className = '' }: ReactionBarProps) {
  const connection = useRondaStore((s) => s.connection);
  const [cooling, setCooling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  async function handleSend(reaction: ReactionId) {
    if (cooling) return;
    setCooling(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCooling(false), REACTION_COOLDOWN_MS);
    await useRondaStore.getState().sendReaction(reaction);
  }

  const disabled = cooling || connection !== 'online';

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`} role="group" aria-label="Reacciones">
      {REACTION_ORDER.map((id) => {
        const face = REACTION_FACES[id];
        return (
          <button
            key={id}
            type="button"
            onClick={() => void handleSend(id)}
            disabled={disabled}
            aria-label={face.label}
            // Zona táctil mínima de §8.5.2 (56px = min-h-14/min-w-14), la
            // misma que usa Button, aunque aquí el contenido sea un emoji.
            className={`flex min-h-14 min-w-14 items-center justify-center rounded-lg border border-linea bg-mesa text-20 transition-opacity ${
              disabled ? 'opacity-40' : ''
            }`}
          >
            <span aria-hidden="true">{face.emoji}</span>
          </button>
        );
      })}
    </div>
  );
}
