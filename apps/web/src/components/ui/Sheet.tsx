// Panel inferior deslizante. Contrato P11: "cierre con gesto y con Escape".
'use client';

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

// Distancia de arrastre hacia abajo (px) a partir de la cual soltar cierra
// el panel, además del propio gesto de "lanzarlo" (velocidad).
const DRAG_CLOSE_THRESHOLD_PX = 80;

export function Sheet({ open, onClose, children, className = '' }: SheetProps) {
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);

  // Cierre con Escape (contrato P11).
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    dragStartY.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const delta = e.clientY - dragStartY.current;
    setDragOffset(Math.max(0, delta));
  }

  function handlePointerUp() {
    if (dragOffset > DRAG_CLOSE_THRESHOLD_PX) {
      onClose();
    }
    setDragOffset(0);
    dragStartY.current = null;
  }

  function handlePointerCancel() {
    setDragOffset(0);
    dragStartY.current = null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-tinta/70"
      />
      <div
        role="dialog"
        aria-modal="true"
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: dragOffset === 0 ? 'transform 200ms ease-out' : 'none',
        }}
        className={`relative z-10 rounded-t-[28px] border-t border-oro/40 bg-mesa px-5 pb-[max(28px,env(safe-area-inset-bottom))] pt-2 shadow-2xl ${className}`}
      >
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="mx-auto mb-3 flex h-10 w-20 touch-none items-center justify-center"
          aria-hidden="true"
        >
          <span className="h-1.5 w-11 rounded-full bg-linea" />
        </div>
        {children}
      </div>
    </div>
  );
}
