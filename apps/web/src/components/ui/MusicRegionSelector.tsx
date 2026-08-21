'use client';

import type { MusicalConfig } from '@ronda/protocol';
import {
  MUSICAL_REGION_OPTIONS,
  normalizeMusicRegions,
  toggleMusicRegion,
  type MusicalRegion,
} from '@/lib/musical';

export interface MusicRegionSelectorProps {
  value: MusicalConfig['regions'];
  onChange: (regions: MusicalConfig['regions']) => void;
}

/** Selector multiopción para los mercados musicales de iTunes. */
export function MusicRegionSelector({ value, onChange }: MusicRegionSelectorProps) {
  const selected = normalizeMusicRegions(value);

  return (
    <fieldset className="surface-panel flex flex-col gap-3 p-4">
      <legend className="text-16 font-semibold text-hueso">Zona musical</legend>
      <p className="text-12 text-humo">
        Marca una o varias zonas. “Todo el mundo” usa varios mercados internacionales.
      </p>
      <div className="grid grid-cols-2 gap-1.5">
        {MUSICAL_REGION_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                onChange(toggleMusicRegion(selected, option.value as MusicalRegion))
              }
              className={`min-h-11 rounded-xl border px-3 text-left text-13 font-semibold transition-colors ${
                isSelected
                  ? 'border-oro bg-oro text-white shadow-sm'
                  : 'border-linea/70 bg-mesa/65 text-humo hover:bg-madera-clara hover:text-hueso'
              }`}
            >
              <span aria-hidden="true" className={isSelected ? 'mr-1.5 text-white' : 'mr-1.5 text-oro'}>
                {isSelected ? '✓' : '○'}
              </span>
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
