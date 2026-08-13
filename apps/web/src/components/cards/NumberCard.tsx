'use client';

import { useRef } from 'react';

export interface NumberCardProps {
  value: number;
  disabled?: boolean;
  onPlay: (value: number) => void;
}

/**
 * Carta numérica de Orden. Acepta toque/clic y un gesto de arrastre hacia el
 * centro; el gesto se resuelve en el cliente y solo se envía una acción.
 */
export function NumberCard({ value, disabled = false, onPlay }: NumberCardProps) {
  const startY = useRef<number | null>(null);
  const committed = useRef(false);

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    startY.current = event.clientY;
    committed.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || committed.current) return;
    const draggedUp = startY.current !== null && startY.current - event.clientY >= 24;
    startY.current = null;
    committed.current = true;
    if (draggedUp || event.pointerType === 'mouse' || event.pointerType === 'touch' || event.pointerType === 'pen') {
      onPlay(value);
    }
  }

  function handlePointerCancel() {
    startY.current = null;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      className="min-h-24 touch-none rounded-xl border border-oro bg-hueso font-mono text-28 font-semibold text-tinta shadow-lg transition-transform active:translate-y-1 disabled:opacity-50"
      aria-label={'Jugar carta ' + value}
    >
      {value}
    </button>
  );
}
