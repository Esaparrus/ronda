'use client';

import { MUSICAL_YEAR_MAX, MUSICAL_YEAR_MIN } from '@ronda/protocol';
import { MUSICAL_DECADE_OPTIONS } from '@/lib/musical';

interface MusicYearPreset {
  label: string;
  from: number;
  to: number;
}

export interface MusicYearRangeControlProps {
  yearFrom: number;
  yearTo: number;
  onChange: (yearFrom: number, yearTo: number) => void;
}

function clampYear(year: number): number {
  return Math.min(MUSICAL_YEAR_MAX, Math.max(MUSICAL_YEAR_MIN, year));
}

function presetFromDecade(from: number | null, to: number | null): MusicYearPreset | null {
  if (from === null || to === null) return null;
  return {
    label: `${from}–${Math.min(to, MUSICAL_YEAR_MAX)}`,
    from: clampYear(from),
    to: clampYear(to),
  };
}

const PRESETS: MusicYearPreset[] = [
  { label: 'Cualquier época', from: MUSICAL_YEAR_MIN, to: MUSICAL_YEAR_MAX },
  ...MUSICAL_DECADE_OPTIONS.slice(1)
    .map((option) => presetFromDecade(option.from, option.to))
    .filter((option): option is MusicYearPreset => option !== null),
  { label: '2000–hoy', from: 2000, to: MUSICAL_YEAR_MAX },
];

export function MusicYearRangeControl({ yearFrom, yearTo, onChange }: MusicYearRangeControlProps) {
  const safeFrom = clampYear(Math.min(yearFrom, yearTo));
  const safeTo = clampYear(Math.max(yearFrom, yearTo));

  function setFrom(value: number) {
    onChange(Math.min(value, safeTo), safeTo);
  }

  function setTo(value: number) {
    onChange(safeFrom, Math.max(value, safeFrom));
  }

  return (
    <fieldset className="surface-panel flex flex-col gap-3 p-4">
      <legend className="text-16 font-semibold text-hueso">Rango de años</legend>
      <p className="text-12 text-humo">
        Elige una década o combina varias moviendo los dos extremos.
      </p>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-oro/35 bg-oro/10 px-3 py-2">
        <span className="text-12 uppercase tracking-wider text-humo">Canciones entre</span>
        <strong className="text-18 text-oro" aria-live="polite">
          {safeFrom}–{safeTo}
        </strong>
      </div>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-12 text-humo">
          Desde {safeFrom}
          <input
            type="range"
            min={MUSICAL_YEAR_MIN}
            max={MUSICAL_YEAR_MAX}
            step={1}
            value={safeFrom}
            onChange={(event) => setFrom(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-oro"
            aria-label="Año inicial"
          />
        </label>
        <label className="flex flex-col gap-1 text-12 text-humo">
          Hasta {safeTo}
          <input
            type="range"
            min={MUSICAL_YEAR_MIN}
            max={MUSICAL_YEAR_MAX}
            step={1}
            value={safeTo}
            onChange={(event) => setTo(Number(event.target.value))}
            className="h-2 w-full cursor-pointer accent-oro"
            aria-label="Año final"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5" aria-label="Atajos de décadas">
        {PRESETS.map((preset) => {
          const selected = safeFrom === preset.from && safeTo === preset.to;
          return (
            <button
              key={preset.label}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(preset.from, preset.to)}
              className={`min-h-10 rounded-full border px-3 text-12 font-semibold transition-colors ${
                selected
                  ? 'border-oro/70 bg-madera-clara text-crema'
                  : 'border-linea bg-tinta/45 text-humo hover:bg-mesa hover:text-hueso'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
