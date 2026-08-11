'use client';

import { CARD_STYLE_OPTIONS, setCardStyle, useCardStyle } from '@/lib/card-style';
import { PlayingCard } from './PlayingCard';

/** Selector de baraja visual. La elección es local a este dispositivo. */
export function CardStylePicker() {
  const selectedStyle = useCardStyle();

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-16 font-semibold text-hueso">Estilo de cartas</legend>
      <p className="text-14 text-humo">
        Elige cómo quieres ver tus cartas. Solo se guarda en este dispositivo.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {CARD_STYLE_OPTIONS.map((option) => {
          const isSelected = option.id === selectedStyle;

          return (
            <button
              key={option.id}
              type="button"
              aria-label={`Usar cartas ${option.label}`}
              aria-pressed={isSelected}
              onClick={() => setCardStyle(option.id)}
              className={`flex min-h-40 flex-col items-center gap-2 rounded-lg border p-3 text-center transition-colors ${
                isSelected
                  ? 'border-brasa bg-brasa/10 text-hueso'
                  : 'border-linea bg-mesa text-humo hover:border-hueso'
              }`}
            >
              <span className="flex h-20 items-end justify-center gap-1" aria-hidden="true">
                <PlayingCard cardId="oros-1" cardStyle={option.id} size="sm" />
                <PlayingCard cardId="copas-12" cardStyle={option.id} size="sm" />
              </span>
              <span className="text-14 font-semibold">{option.label}</span>
              <span className="text-12 text-humo">{option.description}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
