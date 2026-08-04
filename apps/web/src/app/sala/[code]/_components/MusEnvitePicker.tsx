// Cuántas piedras envidar (§12.7): mínimo 2 sobre la mesa limpia, y al menos
// una más que el envite vivo si estás subiendo. El mínimo lo da el servidor
// en `me.minEnvite` -- aquí no se calcula, solo se ofrece a partir de él.
//
// Mismo patrón que PochaBidPicker: una hoja con números grandes tocables.
'use client';

import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';

export interface MusEnvitePickerProps {
  open: boolean;
  /** Piedras mínimas que se pueden envidar ahora mismo. */
  minEnvite: number;
  onConfirm: (piedras: number) => void;
  onCancel: () => void;
}

/** Cuántas opciones se ofrecen a partir del mínimo. Más allá de esto está el
 * órdago, que tiene su propio botón. */
const OPCIONES = 8;

export function MusEnvitePicker({ open, minEnvite, onConfirm, onCancel }: MusEnvitePickerProps) {
  const [selected, setSelected] = useState(minEnvite);

  // Al abrirse con otro mínimo (una subida sobre un envite mayor), el número
  // preseleccionado tiene que moverse con él.
  useEffect(() => {
    setSelected(minEnvite);
  }, [minEnvite, open]);

  const options = Array.from({ length: OPCIONES }, (_, i) => minEnvite + i);

  return (
    <Sheet open={open} onClose={onCancel}>
      <div className="flex flex-col gap-4">
        <p className="text-16 text-hueso">¿Cuántas piedras envidas?</p>
        <div className="flex flex-wrap gap-2">
          {options.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSelected(n)}
              className={`flex h-12 w-12 items-center justify-center rounded-full border font-mono text-16 ${
                n === selected ? 'border-brasa bg-brasa text-hueso' : 'border-linea text-hueso'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <Button onClick={() => onConfirm(selected)}>Envidar {selected}</Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </Sheet>
  );
}
