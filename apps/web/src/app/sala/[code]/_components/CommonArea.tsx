// Zona común: mazo (con nº de cartas restantes) y montón de descarte con la
// carta superior visible. Contrato P14.
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
  /** Presente solo si tocar el descarte es una jugada válida ahora mismo. */
  onDrawDiscard?: () => void;
}

const MAX_VISUAL_DECK_STACK = 5;

export function CommonArea({
  deckCount,
  discardTop,
  discardCount,
  onDrawDiscard,
}: CommonAreaProps) {
  const deckPlaceholders: CardId[] = Array.from(
    { length: Math.min(deckCount, MAX_VISUAL_DECK_STACK) },
    (_, i) => `deck-${i}`,
  );

  return (
    <div className="flex flex-1 items-center justify-center gap-10 py-4">
      <div className="flex flex-col items-center gap-2">
        <Pile cards={deckPlaceholders} faceDown size="sm" />
        <Pill>{deckCount} en el mazo</Pill>
      </div>

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={onDrawDiscard}
          disabled={!onDrawDiscard}
          aria-label={onDrawDiscard ? 'Robar la carta del descarte' : 'Montón de descarte'}
          className="rounded-lg p-1 disabled:cursor-default"
        >
          {discardTop ? (
            <PlayingCard cardId={discardTop} size="sm" />
          ) : (
            <div
              aria-hidden="true"
              className="h-[72px] w-[48px] rounded-lg border border-dashed border-linea"
            />
          )}
        </button>
        <Pill>{discardCount} en el descarte</Pill>
      </div>
    </div>
  );
}
