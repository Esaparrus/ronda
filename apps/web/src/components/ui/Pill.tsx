// Insignia pequeña de texto secundario (estado, contador, etiqueta...). P11.
import type { ReactNode } from 'react';

export interface PillProps {
  children: ReactNode;
  className?: string;
}

export function Pill({ children, className = '' }: PillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-linea/70 bg-mesa/80 px-3 py-1 text-12 font-semibold text-humo shadow-sm ${className}`}
    >
      {children}
    </span>
  );
}
