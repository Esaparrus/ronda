'use client';

import type { GameId } from '@ronda/protocol';
import { GAME_GUIDES } from '@/lib/game-guides';
import { Button } from './Button';
import { GameGuide } from './GameGuide';

export interface GameBriefingProps {
  gameId: GameId;
  onComplete: () => void;
}

export function GameBriefing({ gameId, onComplete }: GameBriefingProps) {
  const guide = GAME_GUIDES[gameId];

  return (
    <main className="app-page safe-page mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-7 px-5">
      <header className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full border border-brasa/70 bg-brasa/15 px-3 py-1.5 font-mono text-12 uppercase tracking-wider text-crema">
            Antes de jugar
          </span>
          <span className="font-mono text-12 uppercase tracking-wider text-humo">
            Lectura · 1 min
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="hero-mark h-[74px] w-[74px] shrink-0 text-32" aria-hidden="true">
            {guide.mark}
          </span>
          <div className="min-w-0">
            <p className="eyebrow">{guide.kind}</p>
            <h1 className="mt-2 font-display text-40 leading-display text-crema">{guide.title}</h1>
          </div>
        </div>

        <p className="rounded-2xl border border-linea bg-tinta/35 px-4 py-3 text-14 leading-relaxed text-humo">
          Esta explicación aparece en el móvil de cada participante. Repasadla antes de entrar en la
          sala.
        </p>
      </header>

      <GameGuide guide={guide} heading="La partida, paso a paso" />

      <div className="sticky bottom-0 z-10 -mx-2 mt-auto border-t border-linea bg-tinta/95 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-4 backdrop-blur-sm">
        <Button onClick={onComplete} className="w-full">
          Entendido · Entrar en la sala
        </Button>
        <p className="mt-2 text-center text-12 text-humo">
          Podrás volver a consultar esta guía desde el lobby.
        </p>
      </div>
    </main>
  );
}
