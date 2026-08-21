// Grupo de botones grandes para elegir entre pocas opciones (número de
// jugadores, umbral de cierre, puntos de eliminación...). Contrato P13 /crear:
// "controles grandes", zona táctil mínima 56px (§8.5.2).
'use client';

export interface SegmentedOption<T extends string | number | boolean> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string | number | boolean> {
  /** Título del grupo (accesible vía <fieldset>/<legend>). */
  legend: string;
  /** Línea de ayuda de menos de 10 palabras (contrato P13). */
  helperText: string;
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string | number | boolean>({
  legend,
  helperText,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="text-16 font-semibold text-hueso">{legend}</legend>
      <p className="text-12 text-humo">{helperText}</p>
      <div className="flex flex-wrap gap-1 rounded-2xl border border-white/80 bg-veta/80 p-1 shadow-inner">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
              className={`min-h-12 flex-1 rounded-xl border px-3 text-14 font-semibold transition-[transform,background-color,border-color,color] active:scale-[0.98] ${
                selected
                  ? 'border-white/90 bg-mesa text-hueso shadow-sm'
                  : 'border-transparent bg-transparent text-humo hover:bg-mesa/55 hover:text-hueso'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
