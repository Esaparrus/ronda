// Selector de cantidad para abrir o subir un envite de Mus.
'use client';

import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';

export interface MusEnvitePickerProps {
  open: boolean;
  /** Piedras mínimas que se pueden envidar ahora mismo. */
  minEnvite: number;
  /** Apuesta anterior, si estamos subiendo. */
  currentBet: number | null;
  onConfirm: (piedras: number) => void;
  onCancel: () => void;
}

/** Cuántas opciones se ofrecen antes de dejar el órdago como acción aparte. */
const OPCIONES = 8;

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

  const options = Array.from({ length: OPCIONES }, (_, i) => minEnvite + i);

  return (
    <Sheet open={open} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-20 font-semibold text-hueso">
            {isRaise ? 'Subir el envite' : 'Abrir el envite'}
          </p>
          <p className="mt-1 text-14 text-humo">
            {isRaise
              ? `Ahora hay ${currentBet} ${currentBet === 1 ? 'piedra' : 'piedras'}. Elige cuánto quieres subir.`
              : 'La apuesta mínima es de 2 piedras.'}
          </p>
        </div>

        <div role="group" aria-label="Cantidad de piedras" className="grid grid-cols-4 gap-2">
          {options.map((amount) => (
            <button
              key={amount}
              type="button"
              aria-pressed={amount === selected}
              onClick={() => setSelected(amount)}
              className={`min-h-14 rounded-lg border font-mono text-18 font-semibold transition-colors ${
                amount === selected
                  ? 'border-brasa bg-brasa text-hueso'
                  : 'border-linea bg-mesa text-hueso'
              }`}
            >
              {amount}
            </button>
          ))}
        </div>

        <p className="text-center text-14 text-humo">
          Seleccionado:{' '}
          <span className="font-mono font-semibold text-hueso">{selected} piedras</span>
        </p>

        <Button onClick={() => onConfirm(selected)} className="w-full">
          {isRaise ? `Subir a ${selected}` : `Envidar ${selected}`}
        </Button>
        <Button variant="ghost" onClick={onCancel} className="w-full">
          Cancelar
        </Button>
      </div>
    </Sheet>
  );
}
