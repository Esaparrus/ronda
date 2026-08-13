'use client';

import { useRef } from 'react';

export interface NumberCardProps {
  value: number;
  disabled?: boolean;
  onPlay: (value: number) => void;
}

export interface NumberCardFaceProps {
  value: number;
  className?: string;
}

function NumberCardContent({ value }: { value: number }) {
  return (
    <>
      <span className="number-card-corner number-card-corner-top" aria-hidden="true">
        {value}
      </span>
      <span className="number-card-mark" aria-hidden="true">
        ✦
      </span>
      <span className="number-card-value">{value}</span>
      <span className="number-card-corner number-card-corner-bottom" aria-hidden="true">
        {value}
      </span>
    </>
  );
}

/**
 * Carta numérica de Orden. Acepta toque/clic y un gesto de arrastre hacia el
 * centro; el gesto se resuelve en el cliente y solo se envía una acción.
 */
export function NumberCard({ value, disabled = false, onPlay }: NumberCardProps) {
  const startY = useRef<number | null>(null);
  const committed = useRef(false);

  function commit() {
    if (disabled || committed.current) return;
    committed.current = true;
    startY.current = null;
    onPlay(value);
  }

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
    if (draggedUp || event.pointerType === 'mouse' || event.pointerType === 'touch' || event.pointerType === 'pen') {
      commit();
    }
  }

  function handlePointerCancel() {
    startY.current = null;
    committed.current = false;
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onClick={commit}
      className="number-card"
      aria-label={'Jugar carta ' + value}
    >
      <NumberCardContent value={value} />
    </button>
  );
}

export function NumberCardFace({ value, className = '' }: NumberCardFaceProps) {
  return (
    <div className={'number-card number-card-static ' + className} aria-label={'Carta ' + value}>
      <NumberCardContent value={value} />
    </div>
  );
}
