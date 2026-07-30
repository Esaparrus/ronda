// Grupo de botones grandes para elegir entre pocas opciones (número de
// jugadores, comodines, umbral de cierre...). Contrato P13 /crear:
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
    <fieldset className="flex flex-col gap-2">
      <legend className="text-16 font-semibold text-hueso">{legend}</legend>
      <p className="text-12 text-humo">{helperText}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(opt.value)}
              className={`min-h-14 flex-1 rounded-lg border px-3 text-16 font-semibold transition-colors ${
                selected
                  ? 'border-brasa bg-brasa text-hueso'
                  : 'border-linea bg-transparent text-hueso'
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
