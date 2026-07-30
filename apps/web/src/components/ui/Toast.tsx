// Aviso transitorio en la parte inferior de la pantalla. Contrato P11.
'use client';

import { useEffect } from 'react';

export interface ToastProps {
  message: string;
  /** Se llama cuando el aviso debe desaparecer, tras `durationMs`. */
  onDismiss: () => void;
  durationMs?: number;
}

const DEFAULT_DURATION_MS = 3000;

export function Toast({ message, onDismiss, durationMs = DEFAULT_DURATION_MS }: ToastProps) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, durationMs);
    return () => window.clearTimeout(id);
  }, [onDismiss, durationMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90vw] rounded-lg border border-linea bg-mesa px-4 py-3 text-14 text-hueso shadow-lg"
    >
      {message}
    </div>
  );
}
