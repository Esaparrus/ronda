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
      <button
        type="button"
        autoFocus
        disabled={disabled}
        onClick={onRoll}
        className="gran-ronda-turn-roll__tap-area"
        aria-label={rolling ? 'Lanzando el dado' : 'Tirar el dado; puedes tocar la pantalla'}
      >
        <span className="gran-ronda-turn-roll__copy">
          <span className="eyebrow">Tu turno</span>
          <span
            className={`gran-ronda-turn-roll__die ${rolling ? 'gran-ronda-turn-roll__die--rolling' : ''}`}
            aria-hidden="true"
          >
            <GranRondaDie value={null} />
          </span>
          <strong id="gran-ronda-turn-roll-title">
            {rolling ? 'Tirando…' : 'Toca para tirar'}
          </strong>
          <small>{rolling ? 'Descubriendo tu tirada' : 'Puedes tocar en cualquier parte'}</small>
        </span>
      </button>
      {children ? <div className="gran-ronda-turn-roll__powerups">{children}</div> : null}
    </div>
  );
}
