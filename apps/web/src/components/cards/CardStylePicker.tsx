'use client';

import { useRef } from 'react';
import type { CardId } from '@ronda/protocol';
import { CARD_STYLE_OPTIONS, setCardStyle, useCardStyle } from '@/lib/card-style';
import { Icon } from '@/components/ui/Icon';
import { PlayingCard } from './PlayingCard';

const PREVIEW_CARDS = ['oros-12', 'copas-10', 'espadas-11'] satisfies CardId[];

/** Selector local de baraja, presentado como un ajuste compacto de iOS. */
export function CardStylePicker() {
  const selectedStyle = useCardStyle();
  const styleDetailsRef = useRef<HTMLDetailsElement>(null);
  const selectedOption =
    CARD_STYLE_OPTIONS.find((option) => option.id === selectedStyle) ?? CARD_STYLE_OPTIONS[0];

  function selectStyle(style: (typeof CARD_STYLE_OPTIONS)[number]['id']) {
    setCardStyle(style);
    styleDetailsRef.current?.removeAttribute('open');
  }

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="text-16 font-semibold text-hueso">Aspecto de las cartas</legend>
      <p className="text-13 text-humo">Solo cambia cómo las ves en este dispositivo.</p>

      <details ref={styleDetailsRef} className="interactive-surface group overflow-hidden">
        <summary className="flex min-h-24 cursor-pointer list-none items-center gap-3 p-3 marker:content-none">
          <span className="flex h-[74px] w-[82px] shrink-0 items-center justify-center" aria-hidden="true">
            {PREVIEW_CARDS.map((cardId, index) => (
              <span
                key={cardId}
                className="inline-flex shrink-0"
                style={{ marginLeft: index === 0 ? 0 : -30, zIndex: index }}
              >
                <PlayingCard cardId={cardId} cardStyle={selectedOption.id} size="sm" />
              </span>
            ))}
          </span>

          <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
            <span className="text-11 font-bold uppercase tracking-wider text-oro">Baraja</span>
            <span className="text-16 font-semibold text-hueso">{selectedOption.label}</span>
            <span className="line-clamp-2 text-12 leading-snug text-humo">
              {selectedOption.description}
            </span>
          </span>

          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-madera-clara text-oro">
            <Icon
              name="arrow-right"
              size={16}
              className="transition-transform group-open:rotate-90"
            />
          </span>
        </summary>

        <div className="border-t border-linea/70 px-3 pb-3 pt-4">
          <p className="mb-3 text-13 font-medium text-humo">Elige el acabado de tu baraja</p>
          <div className="grid grid-cols-2 gap-2">
            {CARD_STYLE_OPTIONS.map((option) => {
              const selected = option.id === selectedStyle;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-label={`Usar cartas ${option.label}`}
                  aria-pressed={selected}
                  onClick={() => selectStyle(option.id)}
                  className={`flex min-h-40 flex-col items-center gap-2 rounded-[18px] border p-3 text-center transition-[border-color,background-color,transform] active:scale-[0.98] ${
                    selected
                      ? 'border-oro bg-oro/8'
                      : 'border-linea/70 bg-mesa/70 hover:border-oro/35'
                  }`}
                >
                  <span className="flex h-[74px] items-end justify-center" aria-hidden="true">
                    {PREVIEW_CARDS.slice(0, 2).map((cardId, index) => (
                      <span
                        key={cardId}
                        className="inline-flex shrink-0"
                        style={{ marginLeft: index === 0 ? 0 : -18, zIndex: index }}
                      >
                        <PlayingCard cardId={cardId} cardStyle={option.id} size="sm" />
                      </span>
                    ))}
                  </span>
                  <span className="text-14 font-semibold text-hueso">{option.label}</span>
                  <span className={selected ? 'text-11 font-semibold text-oro' : 'text-11 text-humo'}>
                    {selected ? 'Seleccionada' : 'Seleccionar'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </details>
    </fieldset>
  );
}
