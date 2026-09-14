'use client';

export interface QuantityStepperOption<T extends number> {
  value: T;
  label?: string;
}

export interface QuantityStepperProps<T extends number> {
  legend: string;
  helperText: string;
  options: readonly QuantityStepperOption<T>[];
  value: T;
  onChange: (value: T) => void;
  valueSuffix?: string;
  disabled?: boolean;
}

/**
 * Selector de cantidades pensado para pulgar: menos, valor y más. Mantiene
 * listas discretas (por ejemplo 5/10/15 puntos), así nunca produce una
 * configuración que el protocolo no admita.
 */
export function QuantityStepper<T extends number>({
  legend,
  helperText,
  options,
  value,
  onChange,
  valueSuffix,
  disabled = false,
}: QuantityStepperProps<T>) {
  const index = Math.max(0, options.findIndex((option) => option.value === value));
  const selected = options[index] ?? options[0];
  const canDecrease = index > 0;
  const canIncrease = index < options.length - 1;

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="text-16 font-semibold text-hueso">{legend}</legend>
      <p className="text-12 text-humo">{helperText}</p>
      <div className="grid grid-cols-[64px_1fr_64px] items-stretch overflow-hidden rounded-2xl border border-linea bg-tinta/45 p-1.5 shadow-inner">
        <button
          type="button"
          disabled={disabled || !canDecrease}
          onClick={() => {
            const previous = options[index - 1];
            if (previous) onChange(previous.value);
          }}
          aria-label={`Bajar ${legend.toLocaleLowerCase('es')}`}
          className="grid min-h-14 place-items-center rounded-xl border border-transparent bg-mesa/70 font-mono text-28 leading-none text-hueso transition-[transform,opacity,background-color] active:scale-95 enabled:hover:bg-madera-clara disabled:opacity-25"
        >
          <span aria-hidden="true">−</span>
        </button>
        <div className="flex min-w-0 flex-col items-center justify-center px-2 text-center" aria-live="polite">
          <span className="font-display text-28 leading-none text-crema">
            {selected?.label ?? value}
          </span>
          {valueSuffix ? (
            <span className="mt-1 text-12 uppercase tracking-wider text-humo">{valueSuffix}</span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={disabled || !canIncrease}
          onClick={() => {
            const next = options[index + 1];
            if (next) onChange(next.value);
          }}
          aria-label={`Subir ${legend.toLocaleLowerCase('es')}`}
          className="grid min-h-14 place-items-center rounded-xl border border-transparent bg-mesa/70 font-mono text-28 leading-none text-hueso transition-[transform,opacity,background-color] active:scale-95 enabled:hover:bg-madera-clara disabled:opacity-25"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </fieldset>
  );
}
