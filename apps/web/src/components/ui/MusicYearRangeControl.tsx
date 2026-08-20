'use client';

import { useRef } from 'react';
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<'from' | 'to' | null>(null);
  const span = MUSICAL_YEAR_MAX - MUSICAL_YEAR_MIN;
  const fromPercent = ((safeFrom - MUSICAL_YEAR_MIN) / span) * 100;
  const toPercent = ((safeTo - MUSICAL_YEAR_MIN) / span) * 100;

  function setFrom(value: number) {
    onChange(Math.min(value, safeTo), safeTo);
  }

  function setTo(value: number) {
    onChange(safeFrom, Math.max(value, safeFrom));
  }

  function yearFromClientX(clientX: number): number {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) return safeFrom;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return clampYear(Math.round(MUSICAL_YEAR_MIN + ratio * span));
  }

  function moveThumb(kind: 'from' | 'to', clientX: number) {
    const year = yearFromClientX(clientX);
    if (kind === 'from') setFrom(year);
    else setTo(year);
  }

  function handlePointerDown(
    kind: 'from' | 'to',
    event: React.PointerEvent<HTMLButtonElement>,
  ) {
    event.preventDefault();
    dragRef.current = kind;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveThumb(kind, event.clientX);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (dragRef.current) moveThumb(dragRef.current, event.clientX);
  }

  function handlePointerEnd(event: React.PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  }

  function handleKeyDown(kind: 'from' | 'to', event: React.KeyboardEvent<HTMLButtonElement>) {
    const current = kind === 'from' ? safeFrom : safeTo;
    let next = current;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') next -= 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') next += 1;
    if (event.key === 'Home') next = MUSICAL_YEAR_MIN;
    if (event.key === 'End') next = MUSICAL_YEAR_MAX;
    if (next === current) return;
    event.preventDefault();
    if (kind === 'from') setFrom(clampYear(next));
    else setTo(clampYear(next));
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
      <div className="flex items-center justify-between gap-4 text-12 text-humo">
        <span>
          Desde <strong className="text-hueso">{safeFrom}</strong>
        </span>
        <span>
          Hasta <strong className="text-hueso">{safeTo}</strong>
        </span>
      </div>
      <div ref={trackRef} className="relative h-10 touch-none select-none" aria-label="Rango de años">
        <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-linea" />
        <div
          className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full bg-oro/80"
          style={{ left: `${fromPercent}%`, right: `${100 - toPercent}%` }}
        />
        <button
          type="button"
          role="slider"
          aria-label="Año inicial"
          aria-valuemin={MUSICAL_YEAR_MIN}
          aria-valuemax={safeTo}
          aria-valuenow={safeFrom}
          aria-valuetext={`Desde ${safeFrom}`}
          onPointerDown={(event) => handlePointerDown('from', event)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={(event) => handleKeyDown('from', event)}
          className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-crema bg-oro shadow-[0_2px_8px_rgba(0,0,0,0.35)] outline-none ring-oro/50 focus-visible:ring-4"
          style={{ left: `${fromPercent}%`, zIndex: safeFrom === safeTo ? 2 : 3 }}
        />
        <button
          type="button"
          role="slider"
          aria-label="Año final"
          aria-valuemin={safeFrom}
          aria-valuemax={MUSICAL_YEAR_MAX}
          aria-valuenow={safeTo}
          aria-valuetext={`Hasta ${safeTo}`}
          onPointerDown={(event) => handlePointerDown('to', event)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={(event) => handleKeyDown('to', event)}
          className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-crema bg-brasa shadow-[0_2px_8px_rgba(0,0,0,0.35)] outline-none ring-brasa/50 focus-visible:ring-4"
          style={{ left: `${toPercent}%`, zIndex: 2 }}
        />
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
