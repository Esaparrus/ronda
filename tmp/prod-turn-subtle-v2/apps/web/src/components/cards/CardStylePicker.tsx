'use client';

import { useRef, useState } from 'react';
import type { CardId } from '@ronda/protocol';
import {
  CARD_PREVIEW_GROUPS,
  DEFAULT_CARD_PREVIEW,
  MAX_CARD_PREVIEW_SELECTION,
  updateCardPreviewSelection,
  type CardPreviewMode,
} from '@/lib/card-preview-selection';
import { CARD_STYLE_OPTIONS, setCardStyle, useCardStyle } from '@/lib/card-style';
import { PlayingCard } from './PlayingCard';

/** Selector de baraja visual. La elección es local a este dispositivo. */
export function CardStylePicker() {
  const selectedStyle = useCardStyle();
  const styleDetailsRef = useRef<HTMLDetailsElement>(null);
  const [previewMode, setPreviewMode] = useState<CardPreviewMode>('multiple');
  const [selectedCards, setSelectedCards] = useState<readonly CardId[]>(DEFAULT_CARD_PREVIEW);
  const previewCards =
    previewMode === 'single' ? selectedCards.slice(0, 1) : selectedCards.slice(0, 4);
  const selectedOption =
    CARD_STYLE_OPTIONS.find((option) => option.id === selectedStyle) ?? CARD_STYLE_OPTIONS[0];

  function selectPreviewCard(cardId: CardId) {
    setSelectedCards((current) => updateCardPreviewSelection(current, cardId, previewMode));
  }

  function selectStyle(style: (typeof CARD_STYLE_OPTIONS)[number]['id']) {
    setCardStyle(style);
    styleDetailsRef.current?.removeAttribute('open');
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-16 font-semibold text-hueso">Estilo de cartas</legend>
      <p className="text-14 text-humo">
        Elige cualquier carta para probarla en todas las barajas. Tu estilo se guarda en este
        dispositivo.
      </p>

      <div
        className="interactive-surface flex w-fit gap-1 self-center p-1"
        role="group"
        aria-label="Cantidad de cartas en la vista previa"
      >
        <button
          type="button"
          aria-pressed={previewMode === 'single'}
          onClick={() => setPreviewMode('single')}
          className={`rounded-lg px-3 py-1.5 text-12 font-semibold transition-colors ${
            previewMode === 'single' ? 'bg-oro text-tinta' : 'text-humo hover:text-hueso'
          }`}
        >
          1 carta
        </button>
        <button
          type="button"
          aria-pressed={previewMode === 'multiple'}
          onClick={() => setPreviewMode('multiple')}
          className={`rounded-lg px-3 py-1.5 text-12 font-semibold transition-colors ${
            previewMode === 'multiple' ? 'bg-oro text-tinta' : 'text-humo hover:text-hueso'
          }`}
        >
          Varias
        </button>
      </div>

      <details className="interactive-surface group p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-14 font-semibold text-hueso marker:content-none">
          <span>Elegir cartas de muestra</span>
          <span className="flex items-center gap-2 text-12 text-oro">
            {previewCards.length} {previewCards.length === 1 ? 'seleccionada' : 'seleccionadas'}
            <span aria-hidden="true" className="transition-transform group-open:rotate-180">
              ▾
            </span>
          </span>
        </summary>

        <p className="mt-2 text-12 text-humo">
          {previewMode === 'single'
            ? 'Selecciona una carta de cualquiera de los cuatro palos.'
            : `Selecciona hasta ${MAX_CARD_PREVIEW_SELECTION}. Desmarca una para cambiarla.`}
        </p>

        <div className="mt-3 flex flex-col gap-4">
          {CARD_PREVIEW_GROUPS.map((group) => (
            <div key={group.suit} role="group" aria-labelledby={`cartas-${group.suit}`}>
              <p
                id={`cartas-${group.suit}`}
                className="mb-2 text-12 font-semibold uppercase tracking-wider text-humo"
              >
                {group.label}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {group.cards.map((cardId) => {
                  const rank = cardId.split('-')[1];
                  const isSelected = previewCards.includes(cardId);

                  return (
                    <button
                      key={cardId}
                      type="button"
                      aria-label={`${isSelected ? 'Quitar' : 'Elegir'} ${rank} de ${group.label}`}
                      aria-pressed={isSelected}
                      onClick={() => selectPreviewCard(cardId)}
                      className={`flex min-w-0 justify-center rounded-xl p-1 transition-colors ${
                        isSelected
                          ? 'bg-oro/15 ring-2 ring-oro'
                          : 'hover:bg-hueso/5 focus-visible:bg-hueso/5'
                      }`}
                    >
                      <PlayingCard cardId={cardId} cardStyle={selectedStyle} size="sm" />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </details>

      <details ref={styleDetailsRef} className="interactive-surface group overflow-hidden">
        <summary className="flex min-h-52 cursor-pointer list-none items-center gap-3 p-3 text-center marker:content-none">
          <span className="flex min-w-0 flex-1 flex-col items-center gap-2 text-hueso">
            <span className="flex h-28 w-full items-end justify-center" aria-hidden="true">
              {previewCards.map((cardId, index) => (
                <span
                  key={cardId}
                  className="inline-flex shrink-0"
                  style={{
                    marginLeft: index === 0 || previewMode === 'single' ? 0 : -14,
                    zIndex: index,
                  }}
                >
                  <PlayingCard
                    cardId={cardId}
                    cardStyle={selectedOption.id}
                    size={previewMode === 'single' ? 'md' : 'sm'}
                  />
                </span>
              ))}
            </span>
            <span className="text-14 font-semibold">{selectedOption.label}</span>
            <span className="text-12 text-humo">{selectedOption.description}</span>
            <span className="text-12 font-semibold text-oro">Seleccionada</span>
          </span>
          <span className="flex shrink-0 flex-col items-center gap-1 text-12 font-semibold text-oro">
            <span>Cambiar</span>
            <span aria-hidden="true" className="text-16 transition-transform group-open:rotate-180">
              ▾
            </span>
          </span>
        </summary>

        <div className="border-t border-linea px-3 pb-3 pt-4">
          <p className="mb-3 text-12 text-humo">Elige otro estilo de cartas</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CARD_STYLE_OPTIONS.filter((option) => option.id !== selectedStyle).map((option) => (
              <button
                key={option.id}
                type="button"
                aria-label={`Usar cartas ${option.label}`}
                onClick={() => selectStyle(option.id)}
                className="interactive-surface flex min-h-48 flex-col items-center gap-2 p-3 text-center text-humo transition-colors hover:border-oro/60 hover:text-hueso"
              >
                <span className="flex h-28 w-full items-end justify-center" aria-hidden="true">
                  {previewCards.map((cardId, index) => (
                    <span
                      key={cardId}
                      className="inline-flex shrink-0"
                      style={{
                        marginLeft: index === 0 || previewMode === 'single' ? 0 : -14,
                        zIndex: index,
                      }}
                    >
                      <PlayingCard
                        cardId={cardId}
                        cardStyle={option.id}
                        size={previewMode === 'single' ? 'md' : 'sm'}
                      />
                    </span>
                  ))}
                </span>
                <span className="text-14 font-semibold">{option.label}</span>
                <span className="text-12 text-humo">{option.description}</span>
                <span className="text-12 font-semibold text-humo">Seleccionar</span>
              </button>
            ))}
          </div>
        </div>
      </details>
    </fieldset>
  );
}
