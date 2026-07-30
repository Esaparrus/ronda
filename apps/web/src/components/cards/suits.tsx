// Los cuatro símbolos de palo, geométricos y propios. Contrato §8.3 / P11.
//
// oros = círculo con anillo interior; copas = arco en U sobre pie
// rectangular; espadas = rombo alargado; bastos = barra con dos muescas.
// Todo con <path>/<circle>/<polygon> — nada de tipografías de iconos ni
// emojis, y nada que imite ninguna baraja comercial existente.
//
// Cada símbolo se dibuja en un lienzo de autor de 60×60 (las coordenadas de
// abajo están comprobadas visualmente a ese tamaño) y se reescala con un
// <g transform="scale(...)"> al tamaño lógico que pida quien lo use. Así el
// mismo trazado sirve para el tamaño `sm` de la carta y para un escaparate
// grande, sin recalcular coordenadas a mano.
import type { JSX } from 'react';
import type { Suit } from '@ronda/protocol';

const AUTHOR_BOX = 60;

export interface SuitSymbolProps {
  /** Color de relleno/trazo del símbolo (token de color, p.ej. var(--color-oro)). */
  color: string;
  /** Lado del cuadro lógico donde se ubica el símbolo. Por defecto 24. */
  size?: number;
}

export function OrosSymbol({ color, size = 24 }: SuitSymbolProps) {
  const s = size / AUTHOR_BOX;
  return (
    <g transform={`scale(${s})`}>
      <circle cx={30} cy={30} r={22} fill="none" stroke={color} strokeWidth={5} />
      <circle cx={30} cy={30} r={9} fill="none" stroke={color} strokeWidth={4} />
    </g>
  );
}

export function CopasSymbol({ color, size = 24 }: SuitSymbolProps) {
  const s = size / AUTHOR_BOX;
  return (
    <g transform={`scale(${s})`}>
      <path
        d="M14,6 C14,28 19,38 30,38 C41,38 46,28 46,6"
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M26,36 L34,36 L34,44 L40,44 C41.1,44 42,44.9 42,46 C42,47.1 41.1,48 40,48 L20,48 C18.9,48 18,47.1 18,46 C18,44.9 18.9,44 20,44 L26,44 Z"
        fill={color}
      />
    </g>
  );
}

export function EspadasSymbol({ color, size = 24 }: SuitSymbolProps) {
  const s = size / AUTHOR_BOX;
  return (
    <g transform={`scale(${s})`}>
      <polygon points="30,2 40,30 30,58 20,30" fill={color} />
    </g>
  );
}

export function BastosSymbol({ color, size = 24 }: SuitSymbolProps) {
  const s = size / AUTHOR_BOX;
  return (
    <g transform={`scale(${s})`}>
      <path
        d="M22,4 L38,4 C38,4 32,12 32,17 C32,22 38,24 38,29 C38,34 32,36 32,41 C32,46 38,48 38,56 L22,56 C22,48 28,46 28,41 C28,36 22,34 22,29 C22,24 28,22 28,17 C28,12 22,4 22,4 Z"
        fill={color}
      />
    </g>
  );
}

const SUIT_SYMBOLS: Record<Suit, (props: SuitSymbolProps) => JSX.Element> = {
  oros: OrosSymbol,
  copas: CopasSymbol,
  espadas: EspadasSymbol,
  bastos: BastosSymbol,
};

/** Dispatcher: dibuja el símbolo del palo pedido. */
export function SuitSymbol({ suit, color, size = 24 }: SuitSymbolProps & { suit: Suit }) {
  const Cmp = SUIT_SYMBOLS[suit];
  return <Cmp color={color} size={size} />;
}
