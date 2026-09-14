'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CARD_DRAG_ACTIVATION_PX,
  isUpwardCardFling,
  pointInsideExpandedRect,
} from '@/lib/card-gesture';

export interface NumberCardProps {
  value: number;
  disabled?: boolean;
  onPlay: (value: number) => void;
  onDragStateChange?: (active: boolean, ready: boolean) => void;
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
interface NumberDragStart {
  pointerId: number;
  x: number;
  y: number;
  moved: boolean;
  currentX: number;
  currentY: number;
  ready: boolean;
}

export function NumberCard({
  value,
  disabled = false,
  onPlay,
  onDragStateChange,
}: NumberCardProps) {
  const start = useRef<NumberDragStart | null>(null);
  const committed = useRef(false);
  const suppressClick = useRef(false);
  const [dragVisual, setDragVisual] = useState<{ x: number; y: number; ready: boolean } | null>(null);

  function commit() {
    if (disabled || committed.current) return;
    committed.current = true;
    start.current = null;
    setDragVisual(null);
    onDragStateChange?.(false, false);
    onPlay(value);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled) return;
    event.preventDefault();
    start.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false,
      currentX: event.clientX,
      currentY: event.clientY,
      ready: false,
    };
    committed.current = false;
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function isOverCenter(x: number, y: number): boolean {
    const zone = document.querySelector<HTMLElement>('[data-card-drop-target="number"]');
    return zone ? pointInsideExpandedRect(x, y, zone.getBoundingClientRect(), 24) : false;
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const drag = start.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (!drag.moved && Math.hypot(deltaX, deltaY) < CARD_DRAG_ACTIVATION_PX) return;
    drag.moved = true;
    event.preventDefault();
    const ready =
      isOverCenter(event.clientX, event.clientY) ||
      isUpwardCardFling(drag.x, drag.y, event.clientX, event.clientY);
    drag.currentX = event.clientX;
    drag.currentY = event.clientY;
    drag.ready = ready;
    setDragVisual({ x: event.clientX, y: event.clientY, ready });
    onDragStateChange?.(true, ready);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || committed.current) return;
    const drag = start.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const shouldCommit =
      !drag.moved ||
      isOverCenter(event.clientX, event.clientY) ||
      isUpwardCardFling(drag.x, drag.y, event.clientX, event.clientY);
    suppressClick.current = drag.moved && !shouldCommit;
    start.current = null;
    setDragVisual(null);
    onDragStateChange?.(false, false);
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Algunos WebViews liberan la captura antes de pointerup.
    }
    if (shouldCommit) {
      commit();
    }
  }

  function handlePointerCancel() {
    suppressClick.current = true;
    start.current = null;
    committed.current = false;
    setDragVisual(null);
    onDragStateChange?.(false, false);
  }

  function handleLostPointerCapture() {
    const drag = start.current;
    if (!drag) return;
    const shouldCommit = drag.moved && drag.ready;
    suppressClick.current = true;
    start.current = null;
    setDragVisual(null);
    onDragStateChange?.(false, false);
    if (shouldCommit) commit();
  }

  function handleClick() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    commit();
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onLostPointerCapture={handleLostPointerCapture}
      onContextMenu={(event) => event.preventDefault()}
      onClick={handleClick}
      className={`number-card ${dragVisual ? 'opacity-20' : ''}`}
      aria-label={'Jugar carta ' + value}
    >
      <NumberCardContent value={value} />
      {typeof document !== 'undefined' && dragVisual
        ? createPortal(
            <div
              aria-hidden="true"
              className={`number-card-drag-preview ${dragVisual.ready ? 'number-card-drag-ready' : ''}`}
              style={{ left: dragVisual.x, top: dragVisual.y }}
            >
              <NumberCardFace value={value} />
            </div>,
            document.body,
          )
        : null}
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
