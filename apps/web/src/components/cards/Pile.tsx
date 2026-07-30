// Montón de cartas apiladas (mazo de robo o descarte). Contrato P11.
//
// La rotación de cada carta es puramente cosmética (da la sensación de un
// montón real, no perfectamente alineado) y se deriva de forma determinista
// del CardId mediante un hash local. Deliberadamente NO se importa nada de
// @ronda/engine aquí: el motor es puro y no sabe nada de píxeles ni grados,
// y esta rotación no tiene ningún significado de estado del juego.
import type { CardId } from '@ronda/protocol';
import { PlayingCard, type CardSize } from './PlayingCard';

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

/** Grados de rotación determinista en [-10, 10] a partir del id de carta. */
function rotationFor(cardId: CardId): number {
  return (Math.abs(hashCode(cardId)) % 21) - 10;
}

export interface PileProps {
  /** Cartas del montón, de abajo a arriba: la última es la visible/arriba del todo. */
  cards: CardId[];
  size?: CardSize;
  /** Si es true, todas las cartas se muestran boca abajo (p.ej. mazo de robo). */
  faceDown?: boolean;
  className?: string;
}

const SIZE_PX: Record<CardSize, { width: number; height: number }> = {
  sm: { width: 48, height: 72 },
  md: { width: 72, height: 108 },
  lg: { width: 120, height: 180 },
};

/** Montón de cartas apiladas con ligera rotación determinista por carta. */
export function Pile({ cards, size = 'md', faceDown = false, className }: PileProps) {
  const { width, height } = SIZE_PX[size];

  if (cards.length === 0) {
    // Hueco vacío del mismo tamaño que una carta, para que el layout no salte.
    return (
      <div
        className={className}
        style={{
          width,
          height,
          borderRadius: 8,
          border: '1.5px dashed var(--color-linea)',
        }}
        role="img"
        aria-label="Montón vacío"
      />
    );
  }

  return (
    <div className={className} style={{ position: 'relative', width, height }}>
      {cards.map((cardId, i) => (
        <div
          key={cardId}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: i,
            transform: `rotate(${rotationFor(cardId)}deg)`,
          }}
        >
          <PlayingCard cardId={cardId} size={size} faceDown={faceDown} />
        </div>
      ))}
    </div>
  );
}
