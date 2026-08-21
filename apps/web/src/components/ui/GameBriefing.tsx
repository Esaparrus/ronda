'use client';

import type { GameId } from '@ronda/protocol';
import { GAME_GUIDES } from '@/lib/game-guides';
import { Button } from './Button';
import { GameGlyph } from './GameGlyph';
import { GameGuide } from './GameGuide';
import { Icon } from './Icon';

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
          <span className="meta-chip text-oro">
            <Icon name="sparkles" size={14} />
            Antes de jugar
          </span>
          <span className="meta-chip">
            <Icon name="clock" size={14} /> 1 min
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span
            className="game-glyph-tile size-[74px] shrink-0 rounded-[23px]"
            data-game={gameId}
          >
            <GameGlyph game={gameId} size={34} />
          </span>
          <div className="min-w-0">
            <p className="eyebrow">{guide.kind}</p>
            <h1 className="mt-2 font-display text-40 leading-display text-hueso">{guide.title}</h1>
          </div>
        </div>

        <p className="surface-panel flex items-start gap-3 px-4 py-3 text-14 leading-relaxed text-humo">
          <Icon name="info" size={18} className="mt-0.5 shrink-0 text-oro" />
          <span>
            Esta explicación aparece en el móvil de cada participante. Repasadla antes de entrar en
            la sala.
          </span>
        </p>
      </header>

      <GameGuide guide={guide} heading="La partida, paso a paso" />

      <div className="liquid-glass liquid-glass--strong sticky bottom-2 z-10 -mx-1 mt-auto rounded-[24px] px-3 pb-[max(10px,env(safe-area-inset-bottom))] pt-3">
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
