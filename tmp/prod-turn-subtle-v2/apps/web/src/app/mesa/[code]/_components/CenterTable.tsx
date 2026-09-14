// Centro del anillo: mazo (con nº de cartas restantes) y descarte (con la
// carta superior visible). Contrato P15: cartas escaladas con clamp() para
// leerse desde 3 metros ("modo distancia"), nada por debajo de 24px
// equivalentes. Vista siempre TableView: nunca lee `me`.
//
// El tamaño de carta se consigue envolviendo <Pile>/<PlayingCard> (P11, que
// solo aceptan sm/md/lg fijos) en un contenedor de ancho `clamp()` y
// forzando el <svg> interior a llenarlo con CSS (`[&_svg]:h-full
// [&_svg]:w-full`), en vez de tocar esos componentes: el `viewBox` del SVG
// ya mantiene la proporción 2:3 del contrato (§8.3) al escalar.
import type { CardId } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { Pile } from '@/components/cards/Pile';
import { Pill } from '@/components/ui/Pill';

export interface CenterTableProps {
  deckCount: number;
  discardTop: CardId | null;
  discardCount: number;
}

const MAX_VISUAL_DECK_STACK = 5;

// Rotación determinista en [-10, 10] grados a partir del CardId, para que
// el lanzamiento al descarte (contrato §8.4) parezca un montón real y no
// una carta perfectamente alineada. Función pequeña y pura, deliberadamente
// duplicada de la de Pile.tsx (privada, no exportada) en vez de exportarla
// solo para este uso puntual.
function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
}

function rotationFor(cardId: CardId): number {
  return (Math.abs(hashCode(cardId)) % 21) - 10;
}

export function CenterTable({ deckCount, discardTop, discardCount }: CenterTableProps) {
  const deckPlaceholders: CardId[] = Array.from(
    { length: Math.min(deckCount, MAX_VISUAL_DECK_STACK) },
    (_, i) => `deck-${i}`,
  );

  return (
    <div className="flex items-center gap-[clamp(1.5rem,6vw,4rem)]">
      <div className="flex flex-col items-center gap-2">
        <div className="w-[clamp(64px,9vw,120px)] [&_svg]:h-full [&_svg]:w-full">
          <Pile cards={deckPlaceholders} faceDown size="lg" />
        </div>
        <Pill className="text-[clamp(0.9rem,1.4vw,1.15rem)]">{deckCount} cartas</Pill>
      </div>

      <div className="flex flex-col items-center gap-2">
        <div
          className="w-[clamp(64px,9vw,120px)] [&_svg]:h-full [&_svg]:w-full"
          style={{ transform: discardTop ? `rotate(${rotationFor(discardTop)}deg)` : undefined }}
        >
          {discardTop ? (
            <div key={discardTop} style={{ animation: 'discard-fling 180ms ease-out' }}>
              <PlayingCard cardId={discardTop} size="lg" />
            </div>
          ) : (
            <div className="aspect-[2/3] rounded-lg border border-dashed border-linea" />
          )}
        </div>
        <Pill className="text-[clamp(0.9rem,1.4vw,1.15rem)]">{discardCount} en el descarte</Pill>
      </div>
    </div>
  );
}
