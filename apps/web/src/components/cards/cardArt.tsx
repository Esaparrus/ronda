// Arte interior de la cara de la carta: pips numéricos (1-9), figuras de
// palo (10 Sota, 11 Caballo, 12 Rey) y los adornos de esquina del comodín.
// Recreación fiel del diseño importado de claude.ai/design (RondaCard),
// coordenadas en el mismo viewBox 0 0 72 108 que PlayingCard, así que no
// hace falta ningún reescalado: SVG ya lo hace gratis vía viewBox.
//
// Cada pip se dibuja en un lienzo local de 60×60 y el llamador lo posiciona
// con `<g transform="translate(x y) scale(s) translate(-30 -30)">` según
// PIP_LAYOUTS. Las figuras de las cartas de la corte y los adornos del
// comodín ya vienen posicionados en coordenadas de carta (0-72 / 0-108).
import type { Suit } from '@ronda/protocol';

const INK = 'var(--card-ink)';
const FACE = 'var(--card-face)';

export interface PipPosition {
  x: number;
  y: number;
  s: number;
}

/** Posiciones (x, y, escala) de los pips por rango, 1..9. */
export const PIP_LAYOUTS: Record<number, PipPosition[]> = {
  1: [{ x: 36, y: 54, s: 0.95 }],
  2: [
    { x: 36, y: 28, s: 0.55 },
    { x: 36, y: 80, s: 0.55 },
  ],
  3: [
    { x: 36, y: 22, s: 0.5 },
    { x: 36, y: 54, s: 0.5 },
    { x: 36, y: 86, s: 0.5 },
  ],
  4: [
    { x: 24, y: 30, s: 0.5 },
    { x: 48, y: 30, s: 0.5 },
    { x: 24, y: 78, s: 0.5 },
    { x: 48, y: 78, s: 0.5 },
  ],
  5: [
    { x: 24, y: 30, s: 0.5 },
    { x: 48, y: 30, s: 0.5 },
    { x: 36, y: 54, s: 0.5 },
    { x: 24, y: 78, s: 0.5 },
    { x: 48, y: 78, s: 0.5 },
  ],
  6: [
    { x: 24, y: 22, s: 0.45 },
    { x: 48, y: 22, s: 0.45 },
    { x: 24, y: 54, s: 0.45 },
    { x: 48, y: 54, s: 0.45 },
    { x: 24, y: 86, s: 0.45 },
    { x: 48, y: 86, s: 0.45 },
  ],
  7: [
    { x: 24, y: 22, s: 0.42 },
    { x: 48, y: 22, s: 0.42 },
    { x: 36, y: 38, s: 0.42 },
    { x: 24, y: 54, s: 0.42 },
    { x: 48, y: 54, s: 0.42 },
    { x: 24, y: 86, s: 0.42 },
    { x: 48, y: 86, s: 0.42 },
  ],
  8: [
    { x: 24, y: 22, s: 0.4 },
    { x: 48, y: 22, s: 0.4 },
    { x: 36, y: 38, s: 0.4 },
    { x: 24, y: 54, s: 0.4 },
    { x: 48, y: 54, s: 0.4 },
    { x: 36, y: 70, s: 0.4 },
    { x: 24, y: 86, s: 0.4 },
    { x: 48, y: 86, s: 0.4 },
  ],
  9: [
    { x: 20, y: 20, s: 0.38 },
    { x: 36, y: 20, s: 0.38 },
    { x: 52, y: 20, s: 0.38 },
    { x: 20, y: 54, s: 0.38 },
    { x: 36, y: 54, s: 0.38 },
    { x: 52, y: 54, s: 0.38 },
    { x: 20, y: 88, s: 0.38 },
    { x: 36, y: 88, s: 0.38 },
    { x: 52, y: 88, s: 0.38 },
  ],
};

const COURT_LETTERS: Record<10 | 11 | 12, string> = { 10: 'S', 11: 'C', 12: 'R' };

/** Letra de esquina de una carta de la corte (Sota/Caballo/Rey), o el rango tal cual para 1-9. */
export function cornerLabel(rank: number): string {
  if (rank === 10 || rank === 11 || rank === 12) return COURT_LETTERS[rank];
  return String(rank);
}

/** Un pip de palo, dibujado en un lienzo local de 60×60 centrado en (30,30). */
export function SuitPip({ suit, color }: { suit: Suit; color: string }) {
  switch (suit) {
    case 'oros':
      return (
        <>
          <circle cx={30} cy={30} r={23} fill={color} stroke={INK} strokeWidth={3.5} />
          <circle cx={30} cy={30} r={11} fill={FACE} stroke={INK} strokeWidth={2.25} />
        </>
      );
    case 'copas':
      return (
        <>
          <path
            d="M11,6 L49,6 C49,30 42,42 30,42 C18,42 11,30 11,6 Z"
            fill={color}
            stroke={INK}
            strokeWidth={3.5}
            strokeLinejoin="round"
          />
          <path
            d="M25,40 L35,40 L35,47 L42,47 C43.7,47 45,48.3 45,50 C45,51.7 43.7,53 42,53 L18,53 C16.3,53 15,51.7 15,50 C15,48.3 16.3,47 18,47 L25,47 Z"
            fill={color}
            stroke={INK}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        </>
      );
    case 'espadas':
      return (
        <>
          <polygon
            points="30,2 35,14 32,44 28,44 25,14"
            fill={color}
            stroke={INK}
            strokeWidth={3.25}
            strokeLinejoin="round"
          />
          <rect x={17} y={41} width={26} height={5} rx={2} fill={color} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <rect x={25.5} y={44} width={9} height={13} rx={3} fill={color} stroke={INK} strokeWidth={3} strokeLinejoin="round" />
          <circle cx={30} cy={58} r={4.5} fill={color} stroke={INK} strokeWidth={3} />
        </>
      );
    case 'bastos':
      return (
        <g transform="rotate(20 30 30)">
          <rect x={20} y={3} width={20} height={56} rx={10} fill={color} stroke={INK} strokeWidth={3.5} />
          <line x1={30} y1={16} x2={30} y2={46} stroke={FACE} strokeWidth={2.25} opacity={0.65} strokeLinecap="round" />
        </g>
      );
  }
}

/** Marco compartido de las cartas de la corte: fondo teñido + borde discontinuo. */
function CourtFrame({ color }: { color: string }) {
  return (
    <>
      <rect x={13} y={13} width={46} height={82} rx={8} fill={color} opacity={0.16} />
      <rect x={13} y={13} width={46} height={82} rx={8} fill="none" stroke={color} strokeWidth={2} strokeDasharray="1 3.5" />
    </>
  );
}

function SotaArt({ suit, color }: { suit: Suit; color: string }) {
  return (
    <>
      <polygon points="25,93 26,68 31,48 41,48 46,68 47,93" fill={color} stroke={INK} strokeWidth={2.75} strokeLinejoin="round" />
      <circle cx={36} cy={38} r={11} fill={color} stroke={INK} strokeWidth={2.75} />
      <rect x={24} y={27} width={24} height={5} rx={2.5} fill={color} stroke={INK} strokeWidth={2.5} />
      <rect x={28} y={17} width={16} height={12} rx={6} fill={color} stroke={INK} strokeWidth={2.5} />
      <g transform="translate(48 56) scale(0.42) translate(-30,-30)">
        <SuitPip suit={suit} color={color} />
      </g>
    </>
  );
}

function CaballoArt({ color }: { color: string }) {
  return (
    <>
      <rect x={20} y={79} width={4} height={16} rx={1.5} fill={color} stroke={INK} strokeWidth={2} />
      <rect x={28} y={80} width={4} height={15} rx={1.5} fill={color} stroke={INK} strokeWidth={2} />
      <rect x={42} y={80} width={4} height={15} rx={1.5} fill={color} stroke={INK} strokeWidth={2} />
      <rect x={50} y={79} width={4} height={16} rx={1.5} fill={color} stroke={INK} strokeWidth={2} />
      <polygon points="17,68 10,63 13,74" fill={color} stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <rect x={17} y={64} width={34} height={15} rx={7} fill={color} stroke={INK} strokeWidth={2.5} />
      <polygon points="45,67 55,48 50,45 39,63" fill={color} stroke={INK} strokeWidth={2.5} strokeLinejoin="round" />
      <polygon points="49,48 56,42 59,44 56,49 50,52" fill={color} stroke={INK} strokeWidth={2.25} strokeLinejoin="round" />
      <polygon points="53,41 56,34 58,42" fill={color} stroke={INK} strokeWidth={1.75} strokeLinejoin="round" />
      <line x1={37} y1={50} x2={45} y2={26} stroke={INK} strokeWidth={2.5} strokeLinecap="round" />
      <rect x={25} y={48} width={13} height={18} rx={5} fill={color} stroke={INK} strokeWidth={2.5} />
      <circle cx={31} cy={42} r={7} fill={color} stroke={INK} strokeWidth={2.5} />
    </>
  );
}

function ReyArt({ color }: { color: string }) {
  return (
    <>
      <path d="M20,86 C20,58 52,58 52,86 Z" fill={color} stroke={INK} strokeWidth={2.75} />
      <circle cx={36} cy={40} r={12} fill={color} stroke={INK} strokeWidth={2.75} />
      <polygon
        points="23,30 28,15 36,25 44,15 49,30"
        fill="var(--card-back-gold)"
        stroke={INK}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
    </>
  );
}

/** Figura de la carta de la corte (10 Sota, 11 Caballo, 12 Rey), con su marco. */
export function CourtIllustration({ rank, suit, color }: { rank: 10 | 11 | 12; suit: Suit; color: string }) {
  return (
    <>
      <CourtFrame color={color} />
      {rank === 10 ? <SotaArt suit={suit} color={color} /> : null}
      {rank === 11 ? <CaballoArt color={color} /> : null}
      {rank === 12 ? <ReyArt color={color} /> : null}
    </>
  );
}

/** Los cuatro adornos de esquina del comodín (decorativos, sin significado de palo). */
export function JokerOrnaments() {
  const color = 'var(--card-joker)';
  return (
    <>
      <g transform="translate(9 9)">
        <g transform="scale(0.22)">
          <circle cx={30} cy={30} r={22} fill={color} stroke={INK} strokeWidth={4} />
          <circle cx={30} cy={30} r={9} fill={FACE} stroke={INK} strokeWidth={3} />
        </g>
      </g>
      <g transform="translate(63 9) scale(-1,1)">
        <g transform="scale(0.22)">
          <path
            d="M14,6 C14,28 19,38 30,38 C41,38 46,28 46,6 Z"
            fill={color}
            stroke={INK}
            strokeWidth={4}
          />
          <path
            d="M26,36 L34,36 L34,44 L40,44 C41.1,44 42,44.9 42,46 C42,47.1 41.1,48 40,48 L20,48 C18.9,48 18,47.1 18,46 C18,44.9 18.9,44 20,44 L26,44 Z"
            fill={color}
            stroke={INK}
            strokeWidth={2.5}
          />
        </g>
      </g>
      <g transform="translate(63 99) scale(-1,-1)">
        <g transform="scale(0.22)">
          <rect x={26.5} y={2} width={7} height={42} rx={3} fill={color} stroke={INK} strokeWidth={3.5} />
          <rect x={18} y={39} width={24} height={6} rx={2} fill={color} stroke={INK} strokeWidth={3} />
          <rect x={26} y={43} width={8} height={11} rx={3} fill={color} stroke={INK} strokeWidth={2.5} />
          <circle cx={30} cy={57} r={4} fill={color} stroke={INK} strokeWidth={2.5} />
        </g>
      </g>
      <g transform="translate(9 99) scale(1,-1)">
        <g transform="scale(0.22)">
          <g transform="rotate(22 30 30)">
            <rect x={20} y={2} width={20} height={56} rx={10} fill={color} stroke={INK} strokeWidth={4} />
          </g>
        </g>
      </g>
    </>
  );
}
