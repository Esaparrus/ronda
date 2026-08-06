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
  showDropTargets?: boolean;
  activeDropTarget?: DropTarget | null;
  canClose?: boolean;
}

export type DropTarget = 'discard' | 'close';

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
  canClose = false,
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
          <Pill className="border-oro bg-tinta text-hueso">{discardCount} descarte</Pill>
        </div>
      </div>

      {showDropTargets ? (
        <div className="grid w-full max-w-[290px] grid-cols-2 gap-2">
          <DropZone
            target="discard"
            active={activeDropTarget === 'discard'}
            title="Descartar"
            hint={activeDropTarget === 'discard' ? 'Suelta para seguir' : 'y seguir jugando'}
          />
          <DropZone
            target="close"
            active={activeDropTarget === 'close'}
            disabled={!canClose}
            title="Cerrar ronda"
            hint={
              canClose
                ? activeDropTarget === 'close'
                  ? 'Suelta para terminar'
                  : 'solo si quieres cerrar'
                : 'aún no disponible'
            }
          />
        </div>
      ) : null}
    </div>
  );
}

function DropZone({
  target,
  active,
  disabled = false,
  title,
  hint,
}: {
  target: DropTarget;
  active: boolean;
  disabled?: boolean;
  title: string;
  hint: string;
}) {
  const colorClasses =
    target === 'close'
      ? active
        ? 'border-oro bg-oro text-tinta shadow-[0_0_18px_var(--color-oro)]'
        : 'border-oro/60 bg-tinta text-hueso'
      : active
        ? 'border-brasa bg-brasa text-hueso shadow-[0_0_18px_var(--color-brasa)]'
        : 'border-brasa/60 bg-tinta text-hueso';

  return (
    <div
      data-drop-target={disabled ? undefined : target}
      aria-disabled={disabled || undefined}
      className={`flex min-h-[46px] flex-col items-center justify-center rounded-lg border border-dashed px-2 py-1 text-center transition-all ${
        disabled ? 'border-linea bg-tinta text-humo opacity-60' : colorClasses
      }`}
    >
      <span className="text-12 font-semibold leading-tight">{title}</span>
      <span className="text-10 leading-tight opacity-80">{hint}</span>
    </div>
  );
}
