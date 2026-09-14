// La mesa (P32, contrato §8.6). Es un mueble, no un rectángulo de color:
// tablero de madera con veta, cuatro tachuelas de latón y un tapete verde
// hundido con su filete rojo y un palo marcado en cada esquina.
//
// Cuadrada y no ovalada a propósito: la mesa ovalada es de casino, y la de
// bar de barrio es cuadrada, de cuatro patas y con el tablero un poco
// levantado sobre el tapete. Los degradados viven en globals.css (.bar-table,
// .bar-felt, .bar-stud) porque ESLint prohíbe literales de color aquí.
//
// Solo pone el mueble. Lo que se apoya encima —mazo y descarte en Chinchón,
// la baza en Pocha, el lance en Mus— lo pasa quien la usa como `children`.
import type { ReactNode } from 'react';

export interface BarTableProps {
  children: ReactNode;
  className?: string;
}

const STUD_CORNERS = [
  { top: 7, left: 7 },
  { top: 7, right: 7 },
  { bottom: 7, left: 7 },
  { bottom: 7, right: 7 },
] as const;

/** Los cuatro palos, uno por esquina del tapete. Marcas, no iconografía:
 * van a 14px y en el rojo apagado del filete, así que se resuelven con la
 * silueta y nada más. */
function SuitMark({ suit }: { suit: 'oros' | 'copas' | 'espadas' | 'bastos' }) {
  return (
    <svg
      viewBox="0 0 60 60"
      width={14}
      height={14}
      aria-hidden="true"
      fill="var(--table-edge)"
      opacity={0.85}
    >
      {suit === 'oros' ? (
        <>
          <circle cx={30} cy={30} r={24} />
          <circle cx={30} cy={30} r={11} fill="var(--table-felt-b)" />
        </>
      ) : null}
      {suit === 'copas' ? (
        <>
          <path d="M10,6 L50,6 C50,32 42,45 30,45 C18,45 10,32 10,6 Z" />
          <path d="M24,42 L36,42 L36,50 L45,50 L45,56 L15,56 L15,50 L24,50 Z" />
        </>
      ) : null}
      {suit === 'espadas' ? (
        <>
          <polygon points="30,2 36,16 33,44 27,44 24,16" />
          <rect x={14} y={41} width={32} height={6} rx={2} />
          <rect x={25} y={45} width={10} height={13} rx={3} />
        </>
      ) : null}
      {suit === 'bastos' ? (
        <g transform="rotate(20 30 30)">
          <rect x={20} y={2} width={20} height={56} rx={10} />
        </g>
      ) : null}
    </svg>
  );
}

export function BarTable({ children, className = '' }: BarTableProps) {
  return (
    <div
      className={`bar-table relative aspect-[340/262] w-full max-w-[340px] rounded-[10px] ${className}`}
    >
      {STUD_CORNERS.map((pos, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="bar-stud absolute h-[7px] w-[7px] rounded-full"
          style={pos}
        />
      ))}

      <div className="bar-felt absolute inset-[13px] flex items-center justify-center gap-4 rounded-[26px]">
        {/* Filete rojo interior: un marco, no un borde del tapete — por eso
         * es un elemento aparte y no un `border` más en .bar-felt. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[11px] rounded-[17px] border-2"
          style={{ borderColor: 'var(--table-edge)' }}
        />
        <span className="absolute left-[17px] top-[15px]">
          <SuitMark suit="oros" />
        </span>
        <span className="absolute right-[17px] top-[15px]">
          <SuitMark suit="copas" />
        </span>
        <span className="absolute bottom-[15px] left-[17px]">
          <SuitMark suit="espadas" />
        </span>
        <span className="absolute bottom-[15px] right-[17px]">
          <SuitMark suit="bastos" />
        </span>

        {children}
      </div>
    </div>
  );
}
