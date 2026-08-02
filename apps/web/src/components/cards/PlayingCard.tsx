// Carta jugable en SVG propio. Contrato §8.3 (representación de cartas) y
// P11 (componente puro, sin dependencias de imagen/emoji).
//
// Recreación del diseño "RondaCard" importado de claude.ai/design: pips
// dispuestos como en una baraja impresa de verdad (1-9), figuras propias
// para Sota/Caballo/Rey (10/11/12), comodín con adornos de esquina, e
// índices de esquina en placa de color (arriba a la izquierda y abajo a la
// derecha, invertido 180° como en cualquier baraja real). El viewBox
// (0 0 72 108) coincide 1:1 con el `viewBox` con el que se autoraron las
// coordenadas del diseño, así que no hace falta reescalar nada a mano.
//
// Nota de contraste (§8.5, AA): el índice de esquina y "JOKER" van siempre
// en tinta de carta (--card-ink) o papel de carta (--card-face) — nunca en
// un color de palo — porque los tokens de palo no alcanzan 4.5:1 sobre
// ninguno de los dos. Los colores de palo se reservan para el propio
// dibujo (símbolo/figura/placa de fondo), donde el contrato exige solo
// 3:1 de contraste no-textual, que sí cumplen.
//
// Deliberadamente sigue siendo un único <svg> como raíz (sin <div>
// envolvente): CenterTable.tsx escala la carta al tamaño `lg` DENTRO de un
// contenedor `clamp()` forzando ese <svg> a `width:100%;height:100%` con
// un selector `[&_svg]`, apoyándose en que el `viewBox` mantiene la
// proporción 2:3. Envolver el svg en un <div> de tamaño fijo rompería ese
// mecanismo de escalado de /mesa.
import { memo } from 'react';
import { parseCardId, type CardId, type Suit } from '@ronda/protocol';
import { CardBack } from './CardBack';
import { CourtIllustration, JokerOrnaments, PIP_LAYOUTS, SuitPip, cornerLabel } from './cardArt';

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

const MELD_COLOR_VAR: Record<0 | 1 | 2 | 3, string> = {
  0: 'var(--card-copas)',
  1: 'var(--card-espadas)',
  2: 'var(--card-bastos)',
  3: 'var(--card-oros)',
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
  /** Pinta una barra de color bajo la carta indicando a qué combinación pertenece. */
  meldColor?: 0 | 1 | 2 | 3;
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
  const suitColor = card.suit ? SUIT_COLOR_VAR[card.suit] : 'var(--card-joker)';

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
        transform: selected ? 'translateY(-14px) rotate(-2.5deg) scale(1.05)' : undefined,
        filter: selected
          ? `drop-shadow(0 10px 14px rgba(0,0,0,.45)) drop-shadow(0 0 8px ${suitColor})`
          : 'drop-shadow(0 4px 0 rgba(27,29,42,.4))',
        transition:
          'transform 220ms cubic-bezier(.34,1.56,.64,1), opacity 150ms ease, filter 150ms ease',
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

      {/* Línea interior de color de palo, inset 6 */}
      <rect
        x={6}
        y={6}
        width={VIEWBOX_WIDTH - 12}
        height={VIEWBOX_HEIGHT - 12}
        rx={6}
        fill="none"
        stroke={suitColor}
        strokeWidth={2}
      />

      {card.isJoker ? (
        <>
          <JokerOrnaments />
          {meldColor !== undefined ? <MeldBar color={MELD_COLOR_VAR[meldColor]} /> : null}
          <text
            x={VIEWBOX_WIDTH / 2}
            y={VIEWBOX_HEIGHT / 2}
            fontFamily="var(--font-display)"
            fontWeight={700}
            fontSize={11}
            fill="var(--card-ink)"
            textAnchor="middle"
            dominantBaseline="middle"
            transform={`rotate(-90 ${VIEWBOX_WIDTH / 2} ${VIEWBOX_HEIGHT / 2})`}
            letterSpacing={2}
          >
            JOKER
          </text>
        </>
      ) : card.rank !== null && card.suit !== null ? (
        <>
          <CardFace rank={card.rank} suit={card.suit} color={suitColor} />
          {meldColor !== undefined ? <MeldBar color={MELD_COLOR_VAR[meldColor]} /> : null}
          <CornerBadge x={5} y={5} label={cornerLabel(card.rank)} bg={suitColor} inkText={card.suit === 'oros'} />
          <CornerBadge
            x={VIEWBOX_WIDTH - 5 - 16}
            y={VIEWBOX_HEIGHT - 5 - 16}
            label={cornerLabel(card.rank)}
            bg={suitColor}
            inkText={card.suit === 'oros'}
            rotate180
          />
        </>
      ) : null}
    </svg>
  );
}

export const PlayingCard = memo(PlayingCardComponent);
PlayingCard.displayName = 'PlayingCard';

/** Barra de color de combinación, bajo la carta. */
function MeldBar({ color }: { color: string }) {
  return (
    <rect
      x={9}
      y={VIEWBOX_HEIGHT - 9}
      width={54}
      height={5}
      rx={2.5}
      fill={color}
      stroke="var(--card-ink)"
      strokeWidth={1}
    />
  );
}

/** El pip o la figura de corte que corresponde al rango: 1-9 pips, 10-12 figura. */
function CardFace({ rank, suit, color }: { rank: number; suit: Suit; color: string }) {
  if (rank >= 10) {
    return <CourtIllustration rank={rank as 10 | 11 | 12} suit={suit} color={color} />;
  }
  const positions = PIP_LAYOUTS[rank] ?? [];
  return (
    <>
      {positions.map((pt, i) => (
        <g key={i} transform={`translate(${pt.x} ${pt.y}) scale(${pt.s}) translate(-30 -30)`}>
          <SuitPip suit={suit} color={color} />
        </g>
      ))}
    </>
  );
}

/** Placa de índice de esquina (arriba-izq. normal, abajo-der. invertida 180°). */
function CornerBadge({
  x,
  y,
  label,
  bg,
  inkText,
  rotate180 = false,
}: {
  x: number;
  y: number;
  label: string;
  bg: string;
  inkText: boolean;
  rotate180?: boolean;
}) {
  const SIZE = 16;
  const cx = x + SIZE / 2;
  const cy = y + SIZE / 2;
  const badge = (
    <>
      <rect x={x} y={y} width={SIZE} height={SIZE} rx={5} fill={bg} stroke="var(--card-ink)" strokeWidth={1.75} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontWeight={700}
        fontSize={11.5}
        fill={inkText ? 'var(--card-ink)' : 'var(--card-face)'}
      >
        {label}
      </text>
    </>
  );
  if (!rotate180) return badge;
  return <g transform={`rotate(180 ${cx} ${cy})`}>{badge}</g>;
}
