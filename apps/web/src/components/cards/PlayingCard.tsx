// Carta jugable. Contrato §8.3 (representación de cartas) y P11 (componente
// puro).
//
// P31: los tres juegos reparten la misma baraja de 40 (§5.1), y de los 40
// naipes hay imagen, así que la cara es SIEMPRE la baraja española de
// `public/cards/` (ver `cardImages.ts`). El dibujo SVG propio que vivía aquí
// —pips, figuras y comodín— se retira con el mismo commit: dejaba de tener
// camino, porque ya no existe carta repartible sin imagen. El marco (fondo,
// contorno de tinta y velo de atenuado) sigue siendo
// SVG, y es lo que le da al naipe su silueta dentro de la app.
//
// El viewBox (0 0 72 108) se mantiene: es la proporción 2:3 de la que depende
// el escalado de /mesa, y las coordenadas literales del contrato (radio de
// esquina, insets, grosores) están autoradas contra él.
//
// Deliberadamente sigue siendo un único <svg> como raíz (sin <div>
// envolvente): CenterTable.tsx escala la carta al tamaño `lg` DENTRO de un
// contenedor `clamp()` forzando ese <svg> a `width:100%;height:100%` con
// un selector `[&_svg]`, apoyándose en que el `viewBox` mantiene la
// proporción 2:3. Envolver el svg en un <div> de tamaño fijo rompería ese
// mecanismo de escalado de /mesa.
import { memo, useId } from 'react';
import { parseCardId, type CardId, type Suit } from '@ronda/protocol';
import { cardStyleRenderMode, useCardStyle, type CardStyle } from '@/lib/card-style';
import { CardBack } from './CardBack';
import { cardImageSrc } from './cardImages';
import { StylizedCardFace } from './StylizedCardFace';

export type CardSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<CardSize, { width: number; height: number }> = {
  sm: { width: 48, height: 72 },
  md: { width: 72, height: 108 },
  lg: { width: 120, height: 180 },
};

// El viewBox de autor coincide 1:1 con el tamaño `md`: así los valores
// literales del contrato (radio de esquina, insets, grosores de línea) se
// aplican tal cual y escalan solos para sm/lg.
const VIEWBOX_WIDTH = 72;
const VIEWBOX_HEIGHT = 108;

const SUIT_COLOR_VAR: Record<Suit, string> = {
  oros: 'var(--card-oros)',
  copas: 'var(--card-copas)',
  espadas: 'var(--card-espadas)',
  bastos: 'var(--card-bastos)',
};

export interface PlayingCardProps {
  /** Id canónico de la carta, p.ej. 'oros-7' o 'joker-1'. */
  cardId: CardId;
  size?: CardSize;
  /** Muestra el dorso en vez de la cara (mano de otro jugador, mazo, etc.). */
  faceDown?: boolean;
  /** Resalta la carta (elevada + brillo del color de palo) — p.ej. seleccionada para jugar. */
  selected?: boolean;
  /** Atenúa la carta (opacidad reducida) — p.ej. no jugable en este turno. */
  dimmed?: boolean;
  /** Estilo concreto para una vista previa; la partida usa la preferencia local. */
  cardStyle?: CardStyle;
  /** Pinta una barra de color bajo la carta indicando a qué combinación pertenece. */
  className?: string;
}

/**
 * Carta jugable, puramente presentacional: sin estado propio, sin efectos.
 * Toda variación visual (tamaño, selección, atenuado) llega por props.
 *
 * Memoizada (contrato P18: "sin re-render de toda la mano al cambiar el
 * turno"). Todas las props son primitivas (string/number/boolean), así que
 * la comparación superficial por defecto de `memo` ya evita volver a
 * renderizar cada `<PlayingCard>` de la mano cuando cambia el turno y solo
 * varían props ajenas a esa carta en concreto.
 */
function PlayingCardComponent({
  cardId,
  size = 'md',
  faceDown = false,
  selected = false,
  dimmed = false,
  cardStyle,
  className,
}: PlayingCardProps) {
  const { width, height } = SIZE_PX[size];
  // Id del recorte redondeado del naipe fotográfico. Se pide siempre —antes
  // de cualquier retorno temprano— porque es un hook, y es único por
  // instancia: dos <PlayingCard> en la misma página no pueden compartir
  // `<clipPath id>` sin que el segundo herede el recorte del primero.
  const clipId = useId();
  const preferredCardStyle = useCardStyle();

  if (faceDown) {
    return (
      <CardBack
        width={width}
        height={height}
        selected={selected}
        dimmed={dimmed}
        className={className}
      />
    );
  }

  const parsed = parseCardId(cardId);
  if (!parsed.ok) {
    // No debería ocurrir con datos del servidor validados por protocol, pero
    // preferimos un dorso "roto" visible a lanzar dentro del árbol de render.
    return (
      <CardBack
        width={width}
        height={height}
        selected={selected}
        dimmed={dimmed}
        className={className}
      />
    );
  }

  const card = parsed.value;
  const suitColor = SUIT_COLOR_VAR[card.suit];
  const resolvedCardStyle = cardStyle ?? preferredCardStyle;
  const renderMode = cardStyleRenderMode(resolvedCardStyle);

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      width={width}
      height={height}
      role="img"
      aria-label={`${card.rank} de ${card.suit}`}
      className={className}
      style={{
        // Nota: el atenuado de `dimmed` NO se hace con `opacity` en este <svg>
        // -- las cartas de la mano se solapan (Hand.tsx) con margen negativo,
        // así que una carta con `opacity` reducida deja translucida la parte
        // que tapa de la carta de detrás (se "veía a través"). En vez de eso
        // se pinta un velo opaco-a-medias DENTRO del propio svg (más abajo,
        // encima de toda la carta): ese svg sigue siendo una capa 100% opaca
        // de cara al resto de la página, así que sigue tapando por completo
        // lo que hay detrás.
        transform: selected ? 'translateY(-14px) rotate(-2.5deg) scale(1.05)' : undefined,
        filter: selected
          ? `drop-shadow(0 10px 14px rgba(0,0,0,.45)) drop-shadow(0 0 8px ${suitColor})`
          : 'drop-shadow(0 4px 0 rgba(27,29,42,.4))',
        transition: 'transform 220ms cubic-bezier(.34,1.56,.64,1), filter 150ms ease',
        overflow: 'visible',
      }}
    >
      {/* Fondo de la carta */}
      <rect
        x={1.75}
        y={1.75}
        width={VIEWBOX_WIDTH - 1.5}
        height={VIEWBOX_HEIGHT - 1.5}
        rx={9}
        fill="var(--card-face)"
        stroke="var(--card-ink)"
        strokeWidth={3.25}
      />

      {/* Recorte con el mismo redondeo que el fondo: la imagen llega
          cuadrada a las esquinas y sin él asomaría por fuera del naipe. */}
      <defs>
        <clipPath id={clipId}>
          <rect
            x={1.75}
            y={1.75}
            width={VIEWBOX_WIDTH - 1.5}
            height={VIEWBOX_HEIGHT - 1.5}
            rx={9}
          />
        </clipPath>
      </defs>
      {/* `preserveAspectRatio="none"`: la imagen es 5:7 y el naipe 2:3, y se
          prefiere estrechar el dibujo un 4,6 % —imperceptible— a recortarlo,
          que se comería el filete de color del borde. */}
      {renderMode === 'image' ? (
        <image
          href={cardImageSrc(card.suit, card.rank, resolvedCardStyle)}
          x={1.75}
          y={1.75}
          width={VIEWBOX_WIDTH - 1.5}
          height={VIEWBOX_HEIGHT - 1.5}
          preserveAspectRatio="none"
          clipPath={`url(#${clipId})`}
        />
      ) : (
        <g clipPath={`url(#${clipId})`}>
          <StylizedCardFace suit={card.suit} rank={card.rank} variant={renderMode} />
        </g>
      )}
      {/* Contorno de tinta repintado ENCIMA de la imagen: el del fondo queda
          tapado por dentro y el naipe perdería la mitad del trazo, que es
          justo lo que lo separa del tapete y de la carta de al lado cuando la
          mano se solapa. */}
      <rect
        x={1.75}
        y={1.75}
        width={VIEWBOX_WIDTH - 1.5}
        height={VIEWBOX_HEIGHT - 1.5}
        rx={9}
        fill="none"
        stroke="var(--card-ink)"
        strokeWidth={3.25}
      />
      {/* Velo de atenuado: mismo contorno redondeado que el fondo, pintado
          ENCIMA de toda la carta en vez de bajar la opacidad del <svg>
          entero (ver nota de más arriba). Siempre montado -- solo cambia su
          opacidad -- para poder animar la transición de encendido/apagado. */}
      <rect
        x={1.75}
        y={1.75}
        width={VIEWBOX_WIDTH - 1.5}
        height={VIEWBOX_HEIGHT - 1.5}
        rx={9}
        fill="var(--color-tinta)"
        opacity={dimmed ? 0.5 : 0}
        style={{ transition: 'opacity 150ms ease' }}
      />
    </svg>
  );
}

export const PlayingCard = memo(PlayingCardComponent);
PlayingCard.displayName = 'PlayingCard';

/** Barra de color de combinación, bajo la carta. */
