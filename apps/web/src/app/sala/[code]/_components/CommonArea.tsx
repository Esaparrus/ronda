// Lo que hay encima del tapete en Chinchón: mazo (con nº de cartas
// restantes) y montón de descarte con la carta superior visible. Contrato
// P14, recolocado por P32 dentro de <BarTable> — antes era una banda a lo
// ancho de la pantalla; ahora es el contenido de la mesa, así que las cartas
// bajan de tamaño 'lg' a 'md' para caber en el tapete sin comerse el filete.
//
// El mazo real es privado (el servidor solo manda `deckCount`, nunca las
// cartas): se generan ids de relleno (`deck-0`, `deck-1`...) solo para que
// <Pile> tenga algo que iterar y rotar boca abajo. No revela nada real: da
// igual qué id de mentira se use, el dorso es siempre el mismo. El montón
// de descarte, en cambio, solo conocemos su carta superior (`discardTop`),
// así que se pinta esa única carta real -no una pila de cartas inventadas
// que podrían sugerir identidades falsas- junto con el recuento total.
import type { CardId } from '@ronda/protocol';
import { PlayingCard } from '@/components/cards/PlayingCard';
import { Pile } from '@/components/cards/Pile';
import { Pill } from '@/components/ui/Pill';

export interface CommonAreaProps {
  deckCount: number;
  discardTop: CardId | null;
  discardCount: number;
  /** Presente solo si tocar el mazo es una jugada válida ahora mismo. */
  onDrawDeck?: () => void;
  /** Presente solo si tocar el descarte es una jugada válida ahora mismo. */
  onDrawDiscard?: () => void;
  /** Permite soltar una carta sobre el propio montón de descarte. */
  showDropTargets?: boolean;
  activeDropTarget?: DropTarget | null;
}

export type DropTarget = 'discard';

const MAX_VISUAL_DECK_STACK = 5;

// Medidas del tamaño 'md' de PlayingCard. El hueco del descarte vacío las
// repite para que el layout no salte cuando aparece la primera carta.
const EMPTY_DISCARD_WIDTH = 72;
const EMPTY_DISCARD_HEIGHT = 108;

export function CommonArea({
  deckCount,
  discardTop,
  discardCount,
  onDrawDeck,
  onDrawDiscard,
  showDropTargets = false,
  activeDropTarget = null,
}: CommonAreaProps) {
  const deckPlaceholders: CardId[] = Array.from(
    { length: Math.min(deckCount, MAX_VISUAL_DECK_STACK) },
    (_, i) => `deck-${i}`,
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-[6px]">
          <button
            type="button"
            onClick={onDrawDeck}
            disabled={!onDrawDeck}
            aria-label={onDrawDeck ? 'Robar del mazo' : 'Mazo'}
            className="rounded-lg disabled:cursor-default"
          >
            <Pile cards={deckPlaceholders} faceDown size="md" />
          </button>
          <Pill className="border-oro bg-tinta text-hueso">{deckCount} mazo</Pill>
        </div>

        <div className="flex flex-col items-center gap-[6px]">
          <div
            data-drop-target={showDropTargets ? 'discard' : undefined}
            className={`rounded-xl transition-all ${
              activeDropTarget === 'discard'
                ? 'ring-2 ring-brasa ring-offset-2 ring-offset-mesa'
                : ''
            }`}
          >
            <button
              type="button"
              onClick={onDrawDiscard}
              disabled={!onDrawDiscard}
              aria-label={onDrawDiscard ? 'Robar la carta del descarte' : 'Montón de descarte'}
              className="rounded-lg disabled:cursor-default"
            >
              {discardTop ? (
                <PlayingCard cardId={discardTop} size="md" />
              ) : (
                <div
                  aria-hidden="true"
                  style={{ width: EMPTY_DISCARD_WIDTH, height: EMPTY_DISCARD_HEIGHT }}
                  className="rounded-lg border border-dashed border-linea"
                />
              )}
            </button>
          </div>
          <Pill className="border-oro bg-tinta text-hueso">{discardCount} cartas</Pill>
        </div>
      </div>
    </div>
  );
}
