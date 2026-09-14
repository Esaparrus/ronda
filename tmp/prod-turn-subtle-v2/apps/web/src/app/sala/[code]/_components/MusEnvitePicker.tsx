// Selector de cantidad para abrir o subir un envite de Mus.
'use client';

import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { PIEDRAS_POR_AMARRAKO, formatMusAmount, musQuickAmounts } from '@/lib/mus';

export interface MusEnvitePickerProps {
  open: boolean;
  /** Piedras mínimas que se pueden envidar ahora mismo. */
  minEnvite: number;
  /** Apuesta anterior, si estamos subiendo. */
  currentBet: number | null;
  onConfirm: (piedras: number) => void;
  onCancel: () => void;
}

export function MusEnvitePicker({
  open,
  minEnvite,
  currentBet,
  onConfirm,
  onCancel,
}: MusEnvitePickerProps) {
  const [selected, setSelected] = useState(minEnvite);
  const isRaise = currentBet !== null;

  useEffect(() => {
    setSelected(minEnvite);
  }, [minEnvite, open]);

  const options = musQuickAmounts(minEnvite);
  const valid = Number.isInteger(selected) && selected >= minEnvite;

  return (
    <Sheet open={open} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-20 font-semibold text-hueso">
            {isRaise ? 'Subir el envite' : 'Abrir el envite'}
          </p>
          <p className="mt-1 text-14 text-humo">
            {isRaise
              ? `Ahora hay ${currentBet} ${currentBet === 1 ? 'piedra' : 'piedras'}. Indica la nueva cantidad total.`
              : '«Envido» son 2 piedras. También puedes cantar cualquier cantidad concreta.'}
          </p>
        </div>

        <div role="group" aria-label="Cantidades rápidas" className="grid grid-cols-2 gap-2">
          {options.map((amount) => (
            <button
              key={amount}
              type="button"
              aria-pressed={amount === selected}
              onClick={() => setSelected(amount)}
              className={`flex min-h-14 flex-col items-center justify-center rounded-lg border px-2 font-semibold transition-colors ${
                amount === selected
                  ? 'border-brasa bg-brasa text-hueso'
                  : 'border-linea bg-mesa text-hueso'
              }`}
            >
              <span className="font-mono text-18">{amount} piedras</span>
              {amount % PIEDRAS_POR_AMARRAKO === 0 ? (
                <span className={`text-11 ${amount === selected ? 'text-hueso/80' : 'text-humo'}`}>
                  {amount / PIEDRAS_POR_AMARRAKO}{' '}
                  {amount === PIEDRAS_POR_AMARRAKO ? 'amarrako' : 'amarrakos'}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-2 text-14 text-hueso" htmlFor="mus-envite-personalizado">
          Otra cantidad
          <input
            id="mus-envite-personalizado"
            type="number"
            inputMode="numeric"
            min={minEnvite}
            step={1}
            value={selected}
            onChange={(event) => setSelected(Number(event.target.value))}
            className="form-control px-4 font-mono text-18"
            aria-describedby="mus-envite-resumen"
          />
        </label>

        <p id="mus-envite-resumen" className="text-center text-14 text-humo" aria-live="polite">
          {valid ? (
            <>
              Seleccionado:{' '}
              <span className="font-semibold text-hueso">{formatMusAmount(selected)}</span>
            </>
          ) : (
            `El mínimo ahora es ${minEnvite}.`
          )}
        </p>

        <Button onClick={() => onConfirm(selected)} disabled={!valid} className="w-full">
          {isRaise ? `Subir a ${selected}` : `Envidar ${selected}`}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="w-full">
          Cancelar
        </Button>
      </div>
    </Sheet>
  );
}
