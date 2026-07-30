// Dorso de carta: tinta + trama diagonal en linea + punto brasa central.
// Mismo viewBox lógico que PlayingCard (72x108) para que dorso y cara midan
// exactamente igual y encajen en el mismo hueco de layout. Contrato P11.
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
        {/* Retícula diagonal a 45°, dibujada como línea de esquina a esquina de
            una baldosa de 8x8 en vez de con patternTransform: algunos
            renderizadores SVG (p.ej. rsvg, usado por herramientas de
            comprobación offline) no aplican bien la rotación de un patrón,
            así que se dibuja la diagonal directamente para que el resultado
            sea el mismo en cualquier motor de render. */}
        <pattern id={patternId} width={8} height={8} patternUnits="userSpaceOnUse">
          <line x1={0} y1={8} x2={8} y2={0} stroke="var(--color-linea)" strokeWidth={1.5} />
        </pattern>
      </defs>

      <rect
        x={0.75}
        y={0.75}
        width={VIEWBOX_WIDTH - 1.5}
        height={VIEWBOX_HEIGHT - 1.5}
        rx={8}
        fill="var(--color-tinta)"
        stroke={selected ? 'var(--color-brasa)' : 'var(--color-linea)'}
        strokeWidth={selected ? 2 : 1}
      />
      <rect
        x={0.75}
        y={0.75}
        width={VIEWBOX_WIDTH - 1.5}
        height={VIEWBOX_HEIGHT - 1.5}
        rx={8}
        fill={`url(#${patternId})`}
      />
      <circle cx={VIEWBOX_WIDTH / 2} cy={VIEWBOX_HEIGHT / 2} r={6} fill="var(--color-brasa)" />
    </svg>
  );
}
