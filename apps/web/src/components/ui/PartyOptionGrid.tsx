'use client';

export interface PartyOptionGridProps<T extends string | number | boolean> {
  legend: string;
  helperText: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  columns: 'three' | 'five';
}

export function PartyOptionGrid<T extends string | number | boolean>({
  legend,
  helperText,
  options,
  value,
  onChange,
  columns,
}: PartyOptionGridProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-16 font-semibold text-hueso">{legend}</legend>
      <p className="text-12 text-humo">{helperText}</p>
      <div className={`grid gap-2 ${columns === 'five' ? 'grid-cols-5' : 'grid-cols-3'}`}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={`min-h-14 rounded-xl border px-2 text-16 font-semibold transition-colors ${
                selected
                  ? 'border-oro bg-oro text-white shadow-[0_7px_16px_rgb(0_122_255_/_0.2)]'
                  : 'border-linea/70 bg-mesa/65 text-hueso active:bg-madera-clara'
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
