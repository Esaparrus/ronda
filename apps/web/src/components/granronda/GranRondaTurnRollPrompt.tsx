'use client';

import type { ReactNode } from 'react';
import { GranRondaDie } from './GranRondaDiceOverlay';

export interface GranRondaTurnRollPromptProps {
  disabled: boolean;
  rolling: boolean;
  onRoll: () => void;
  children?: ReactNode;
}

export function GranRondaTurnRollPrompt({
  disabled,
  rolling,
  onRoll,
  children,
}: GranRondaTurnRollPromptProps) {
  return (
    <div
      className="gran-ronda-turn-roll"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gran-ronda-turn-roll-title"
    >
      <div className="gran-ronda-turn-roll__veil" aria-hidden="true" />
      <section className="gran-ronda-turn-roll__panel">
        <p className="eyebrow text-oro">Tu turno</p>
        <h2 id="gran-ronda-turn-roll-title" className="font-display text-32 text-hueso">
          ¡Te toca!
        </h2>
        <p className="max-w-64 text-13 leading-relaxed text-humo">
          Toca el dado para lanzarlo y descubrir cuántas casillas avanzas.
        </p>
        <button
          type="button"
          autoFocus
          disabled={disabled}
          onClick={onRoll}
          className="gran-ronda-turn-roll__button"
          aria-label={rolling ? 'Lanzando el dado' : 'Tirar el dado'}
        >
          <span
            className={`gran-ronda-turn-roll__die ${rolling ? 'gran-ronda-turn-roll__die--rolling' : ''}`}
            aria-hidden="true"
          >
            <GranRondaDie value={null} />
          </span>
          <strong>{rolling ? 'Tirando…' : 'Toca el dado'}</strong>
        </button>
        {children ? <div className="gran-ronda-turn-roll__powerups">{children}</div> : null}
      </section>
    </div>
  );
}
