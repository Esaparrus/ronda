// Selector de cante (§9.4): una fila de números tocables entre 0 y
// `roundSize`, dentro de un Sheet (mismo componente que GameScreen.tsx usa
// para confirmar el cierre en Chinchón). El servidor valida INVALID_BID /
// BID_HOOKED (enganche del repartidor) -- el cliente no calcula legalidad,
// solo envía el número elegido y muestra el error si lo rechaza.
'use client';

import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';

export interface PochaBidPickerProps {
  open: boolean;
  roundSize: number;
  onConfirm: (amount: number) => void;
}

export function PochaBidPicker({ open, roundSize, onConfirm }: PochaBidPickerProps) {
  const [selected, setSelected] = useState(0);

  const options = Array.from({ length: roundSize + 1 }, (_, n) => n);

  return (
    <Sheet open={open} onClose={() => {}}>
      <div className="flex flex-col gap-4">
        <p className="text-16 text-hueso">¿Cuántas bazas crees que vas a ganar?</p>
        <div className="flex flex-wrap gap-2">
          {options.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSelected(n)}
              className={`flex h-12 w-12 items-center justify-center rounded-full border font-mono text-16 ${
                n === selected
                  ? 'border-oro bg-oro text-white shadow-md'
                  : 'border-linea bg-mesa/70 text-hueso'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
        <Button onClick={() => onConfirm(selected)}>Cantar {selected}</Button>
      </div>
    </Sheet>
  );
}
