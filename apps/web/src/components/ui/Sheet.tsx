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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          transform: `translateY(${dragOffset}px)`,
          transition: dragOffset === 0 ? 'transform 200ms ease-out' : 'none',
        }}
        className={`relative z-10 rounded-t-2xl border-t border-linea bg-mesa px-6 pb-8 pt-3 ${className}`}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-linea" aria-hidden="true" />
        {children}
      </div>
    </div>
  );
}
