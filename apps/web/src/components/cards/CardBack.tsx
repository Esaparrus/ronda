// Dorso de carta: recreación del diseño "RondaCard" importado de
// claude.ai/design — trama diagonal en dos tonos violeta, borde y filete
// dorados, y un emblema de rombos anidados en el centro. Mismo viewBox
// lógico que PlayingCard (72x108) para que dorso y cara midan exactamente
// igual y encajen en el mismo hueco de layout. Contrato P11.
import { useId } from 'react';

const VIEWBOX_WIDTH = 72;
const VIEWBOX_HEIGHT = 108;

export interface CardBackProps {
  width: number;
  height: number;
  selected?: boolean;
  dimmed?: boolean;
  className?: string;
}

/**
 * Dorso de carta, puramente presentacional. Usa useId() para que el
 * <pattern> de la trama tenga un id único por instancia: sin esto, renderizar
 * varios dorsos a la vez (p.ej. en un Pile o en la mano de un rival) haría
 * que todas las instancias compartieran (y potencialmente rompieran) el
 * mismo id de patrón SVG.
 */
export function CardBack({
  width,
  height,
  selected = false,
  dimmed = false,
  className,
}: CardBackProps) {
  const patternId = useId();

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      width={width}
      height={height}
      role="img"
      aria-label="Carta boca abajo"
      className={className}
      style={{
        opacity: dimmed ? 0.5 : 1,
        transform: selected ? 'translateY(-6px)' : undefined,
        transition: 'transform 150ms ease, opacity 150ms ease',
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Diagonal a 45° dibujada como dos triángulos (en vez de
            patternTransform="rotate(45)"): algunos renderizadores SVG
            (p.ej. rsvg, usado por herramientas de comprobación offline) no
            aplican bien la rotación de un patrón, así que la diagonal se
            consigue con la geometría del propio mosaico, portable a
            cualquier motor de render (mismo criterio que el dorso anterior). */}
        <pattern id={patternId} width={10} height={10} patternUnits="userSpaceOnUse">
          <rect width={10} height={10} fill="var(--card-back-a)" />
          <polygon points="10,0 10,10 0,10" fill="var(--card-back-b)" />
        </pattern>
      </defs>

      <rect
        x={1.75}
        y={1.75}
        width={VIEWBOX_WIDTH - 1.5}
        height={VIEWBOX_HEIGHT - 1.5}
        rx={9}
        fill={`url(#${patternId})`}
        stroke={selected ? 'var(--color-brasa)' : 'var(--card-back-gold)'}
        strokeWidth={selected ? 3.5 : 3}
      />
      <rect
        x={6}
        y={6}
        width={VIEWBOX_WIDTH - 12}
        height={VIEWBOX_HEIGHT - 12}
        rx={6}
        fill="none"
        stroke="var(--card-back-gold)"
        strokeWidth={1.25}
        opacity={0.7}
      />

      <g transform={`translate(${VIEWBOX_WIDTH / 2} ${VIEWBOX_HEIGHT / 2})`}>
        <polygon
          points="0,-19 15,0 0,19 -15,0"
          fill="var(--card-back-gold)"
          stroke="var(--card-ink)"
          strokeWidth={2.5}
        />
        <polygon points="0,-9 7,0 0,9 -7,0" fill="var(--color-brasa)" stroke="var(--card-ink)" strokeWidth={1.75} />
      </g>
    </svg>
  );
}
