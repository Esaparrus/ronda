'use client';

import { useEffect, useState, type ReactNode } from 'react';
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
  const [stage, setStage] = useState<'announcement' | 'roll'>('announcement');

  useEffect(() => {
    const timer = window.setTimeout(() => setStage('roll'), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const announcing = stage === 'announcement' && !rolling;

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
        autoFocus={!announcing}
        disabled={disabled || announcing}
        onClick={onRoll}
        className="gran-ronda-turn-roll__tap-area"
        aria-label={
          announcing
            ? 'Es tu turno'
            : rolling
              ? 'Lanzando el dado'
              : 'Tirar el dado; puedes tocar la pantalla'
        }
      >
        {announcing ? (
          <span className="gran-ronda-turn-roll__copy gran-ronda-turn-roll__copy--announcement">
            <span className="eyebrow">Prepárate</span>
            <strong id="gran-ronda-turn-roll-title">Tu turno</strong>
            <small>Ahora aparecerá el dado</small>
          </span>
        ) : (
          <span className="gran-ronda-turn-roll__copy">
            <span className="eyebrow">Lanza el dado</span>
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
        )}
      </button>
      {!announcing && children ? (
        <div className="gran-ronda-turn-roll__powerups">{children}</div>
      ) : null}
    </div>
  );
}
