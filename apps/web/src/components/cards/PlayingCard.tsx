// Carta jugable en SVG propio. Contrato §8.3 (representación de cartas) y
// P11 (componente puro, sin dependencias de imagen/emoji).
//
// Nota de contraste (§8.5, AA): oro y humo no alcanzan 4.5:1 (ni el umbral
// relajado de 3:1) sobre hueso, así que el número de rango y el texto
// "JOKER" se pintan siempre en tinta (14.5:1 sobre hueso, sobra de sobra).
// Los tokens de palo (oro/azul/verde/brasa) se reservan para elementos NO
// textuales -- el símbolo y la línea interior -- donde el contrato exige
// solo 3:1 de contraste no-textual/gráfico, que si cumplen.
import { parseCardId, type CardId } from '@ronda/protocol';
import { CardBack } from './CardBack';
import { SuitSymbol } from './suits';

export type CardSize = 'sm' | 'md' | 'lg';

const SIZE_PX: Record<CardSize, { width: number; height: number }> = {
  sm: { width: 48, height: 72 },
  md: { width: 72, height: 108 },
  lg: { width: 120, height: 180 },
};

// El viewBox de autor coincide 1:1 con el tamaño `md`: así los valores
// literales del contrato (radio de esquina 8px, inset de borde 6px, grosor
// de línea 1.5px) se aplican tal cual y escalan solos para sm/lg.
const VIEWBOX_WIDTH = 72;
const VIEWBOX_HEIGHT = 108;

const SUIT_COLOR_VAR: Record<'oros' | 'copas' | 'espadas' | 'bastos', string> = {
  oros: 'var(--color-oro)',
  copas: 'var(--color-brasa)',
  espadas: 'var(--color-azul)',
  bastos: 'var(--color-verde)',
};

const MELD_COLOR_VAR: Record<0 | 1 | 2 | 3, string> = {
  0: 'var(--color-brasa)',
  1: 'var(--color-azul)',
  2: 'var(--color-verde)',
  3: 'var(--color-oro)',
};

export interface PlayingCardProps {
  /** Id canónico de la carta, p.ej. 'oros-7' o 'joker-1'. */
  cardId: CardId;
  size?: CardSize;
  /** Muestra el dorso en vez de la cara (mano de otro jugador, mazo, etc.). */
  faceDown?: boolean;
  /** Resalta la carta (elevada + borde brasa) — p.ej. seleccionada para jugar. */
  selected?: boolean;
  /** Atenúa la carta (opacidad reducida) — p.ej. no jugable en este turno. */
  dimmed?: boolean;
  /** Pinta una barra de color bajo la carta indicando a qué combinación pertenece. */
  meldColor?: 0 | 1 | 2 | 3;
  className?: string;
}

/**
 * Carta jugable, puramente presentacional: sin estado propio, sin efectos.
 * Toda variación visual (tamaño, selección, atenuado) llega por props.
 */
export function PlayingCard({
  cardId,
  size = 'md',
  faceDown = false,
  selected = false,
  dimmed = false,
  meldColor,
  className,
}: PlayingCardProps) {
  const { width, height } = SIZE_PX[size];

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
  const suitColor = card.suit ? SUIT_COLOR_VAR[card.suit] : 'var(--color-humo)';

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
      width={width}
      height={height}
      role="img"
      aria-label={card.isJoker ? 'Comodín' : `${card.rank} de ${card.suit}`}
      className={className}
      style={{
        opacity: dimmed ? 0.5 : 1,
        transform: selected ? 'translateY(-6px)' : undefined,
        transition: 'transform 150ms ease, opacity 150ms ease',
        overflow: 'visible',
      }}
    >
      {/* Fondo de la carta */}
      <rect
        x={0.75}
        y={0.75}
        width={VIEWBOX_WIDTH - 1.5}
        height={VIEWBOX_HEIGHT - 1.5}
        rx={8}
        fill="var(--color-hueso)"
        stroke={selected ? 'var(--color-brasa)' : 'var(--color-linea)'}
        strokeWidth={selected ? 2 : 1}
      />

      {/* Línea interior de color de palo, inset 6px */}
      <rect
        x={6}
        y={6}
        width={VIEWBOX_WIDTH - 12}
        height={VIEWBOX_HEIGHT - 12}
        rx={4}
        fill="none"
        stroke={suitColor}
        strokeWidth={1.5}
      />

      {card.isJoker ? (
        <JokerFace />
      ) : (
        <>
          {/* Índice de rango, esquina superior izquierda (contrato §8.3: Familjen Grotesk 700) */}
          <text
            x={11}
            y={19}
            fontFamily="var(--font-display)"
            fontWeight={700}
            fontSize={14}
            fill="var(--color-tinta)"
          >
            {card.rank}
          </text>
          {/* Índice de rango, esquina inferior derecha, rotado 180° */}
          <text
            x={VIEWBOX_WIDTH - 11}
            y={VIEWBOX_HEIGHT - 19 + 14}
            fontFamily="var(--font-display)"
            fontWeight={700}
            fontSize={14}
            fill="var(--color-tinta)"
            textAnchor="end"
            transform={`rotate(180 ${VIEWBOX_WIDTH - 11} ${VIEWBOX_HEIGHT - 19})`}
          >
            {card.rank}
          </text>

          {/* Símbolo de palo central */}
          <g transform={`translate(${VIEWBOX_WIDTH / 2 - 15} ${VIEWBOX_HEIGHT / 2 - 15})`}>
            {card.suit ? <SuitSymbol suit={card.suit} color={suitColor} size={30} /> : null}
          </g>
        </>
      )}

      {meldColor !== undefined ? (
        <rect
          x={10}
          y={VIEWBOX_HEIGHT - 6}
          width={VIEWBOX_WIDTH - 20}
          height={3}
          rx={1.5}
          fill={MELD_COLOR_VAR[meldColor]}
        />
      ) : null}
    </svg>
  );
}

const JOKER_CORNERS: Array<{
  x: number;
  y: number;
  suit: 'oros' | 'copas' | 'espadas' | 'bastos';
}> = [
  { x: 8, y: 8, suit: 'oros' },
  { x: VIEWBOX_WIDTH - 20, y: 8, suit: 'copas' },
  { x: VIEWBOX_WIDTH - 20, y: VIEWBOX_HEIGHT - 20, suit: 'espadas' },
  { x: 8, y: VIEWBOX_HEIGHT - 20, suit: 'bastos' },
];

function JokerFace() {
  return (
    <>
      {JOKER_CORNERS.map((c) => (
        <g key={c.suit} transform={`translate(${c.x} ${c.y})`}>
          <SuitSymbol suit={c.suit} color="var(--color-humo)" size={12} />
        </g>
      ))}
      <text
        x={VIEWBOX_WIDTH / 2}
        y={VIEWBOX_HEIGHT / 2}
        fontFamily="var(--font-display)"
        fontWeight={700}
        fontSize={12}
        fill="var(--color-tinta)"
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(-90 ${VIEWBOX_WIDTH / 2} ${VIEWBOX_HEIGHT / 2})`}
        letterSpacing={2}
      >
        JOKER
      </text>
    </>
  );
}
